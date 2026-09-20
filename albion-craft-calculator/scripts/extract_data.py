import os
import json
import urllib.request
import sys

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "data", "albion_crafting_data.json")
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

ITEMS_JSON_URL = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json"
FORMATTED_ITEMS_URL = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json"

def download_file(url, local_name):
    path = os.path.join(CACHE_DIR, local_name)
    if os.path.exists(path) and os.path.getsize(path) > 1000:
        print(f"Using cached {local_name} ({os.path.getsize(path)} bytes)")
        return path
    print(f"Downloading {url}...")
    urllib.request.urlretrieve(url, path)
    print(f"Downloaded to {path} ({os.path.getsize(path)} bytes)")
    return path

def run_extraction():
    formatted_path = download_file(FORMATTED_ITEMS_URL, "formatted_items.json")
    items_path = download_file(ITEMS_JSON_URL, "items.json")

    print("Loading formatted item names...")
    with open(formatted_path, "r", encoding="utf-8") as f:
        formatted_data = json.load(f)

    # Map UniqueName -> names
    name_map = {}
    for item in formatted_data:
        uname = item.get("UniqueName")
        if not uname:
            continue
        loc_names = item.get("LocalizedNames") or {}
        en = loc_names.get("EN-US", uname)
        pl = loc_names.get("PL-PL", en)
        name_map[uname] = {
            "en": en,
            "pl": pl
        }

    print("Loading items.json...")
    with open(items_path, "r", encoding="utf-8") as f:
        raw_items_data = json.load(f)

    items_dict = raw_items_data.get("items", {})

    def parse_craft_req(req_node):
        if not req_node:
            return None
        if isinstance(req_node, list):
            req_node = req_node[0]
        
        resources = []
        raw_res = req_node.get("craftresource", [])
        if isinstance(raw_res, dict):
            raw_res = [raw_res]
        
        for r in raw_res:
            res_id = r.get("@uniquename")
            count = int(r.get("@count", 1))
            enc = int(r.get("@enchantmentlevel", 0))
            if res_id:
                resources.append({
                    "id": res_id,
                    "count": count,
                    "enchantment": enc
                })
        
        silver = int(float(req_node.get("@silver", 0)))
        amount_crafted = int(req_node.get("@amountcrafted", 1))
        focus = int(req_node.get("@craftingfocus", 0))
        time = float(req_node.get("@time", 1))
        
        return {
            "silver": silver,
            "amountCrafted": amount_crafted,
            "focus": focus,
            "time": time,
            "resources": resources
        }

    target_categories = {
        "weapon": "weapons",
        "equipmentitem": "equipment",
        "consumableitem": "consumables",
        "simpleitem": "resources"
    }

    craftable_items = []

    for section_key, broad_cat in target_categories.items():
        node_list = items_dict.get(section_key, [])
        if isinstance(node_list, dict):
            node_list = [node_list]
        
        for item in node_list:
            uname = item.get("@uniquename")
            if not uname:
                continue

            base_req = parse_craft_req(item.get("craftingrequirements"))
            enchantment_data = item.get("enchantments", {})
            ench_list = enchantment_data.get("enchantment", []) if isinstance(enchantment_data, dict) else []
            if isinstance(ench_list, dict):
                ench_list = [ench_list]

            if not base_req and not ench_list:
                continue

            tier = int(item.get("@tier", 1))
            if tier < 2:
                continue

            item_val = int(float(item.get("@itemvalue", 0)))
            weight = float(item.get("@weight", 0.1))
            fame = float(item.get("@craftingfame", 0))
            shop_cat = item.get("@shopcategory", broad_cat)
            sub_cat = item.get("@shopsubcategory1", "")
            slot = item.get("@slottype", "")
            craft_cat = item.get("@craftingcategory", "")

            if fame == 0 and item_val > 0:
                fame = item_val * 2

            normalized_subcat = sub_cat or craft_cat or slot or "general"
            
            is_refining = (shop_cat == "crafting" and "refined" in sub_cat) or craft_cat in ["wood", "ore", "hide", "fiber", "rock", "stone"]
            if is_refining:
                broad_cat = "refining"
                normalized_subcat = craft_cat

            if broad_cat == "consumables":
                if "potion" in uname.lower() or craft_cat == "potion" or "potion" in sub_cat:
                    broad_cat = "alchemy"
                    normalized_subcat = "potion"
                elif "meal" in uname.lower() or "fish" in uname.lower() or craft_cat in ["food", "cooked"] or "cooked" in sub_cat:
                    broad_cat = "cooking"
                    normalized_subcat = "food"

            recipes = {}
            if base_req and len(base_req["resources"]) > 0:
                recipes["0"] = base_req

            for enc in ench_list:
                enc_lvl = str(enc.get("@enchantmentlevel", 1))
                enc_req = parse_craft_req(enc.get("craftingrequirements"))
                if enc_req and len(enc_req["resources"]) > 0:
                    recipes[enc_lvl] = enc_req

            if not recipes:
                continue

            journal_type = None
            if broad_cat == "weapons":
                if any(w in normalized_subcat for w in ["sword", "axe", "mace", "hammer", "crossbow", "shield"]):
                    journal_type = "blacksmith"
                elif any(w in normalized_subcat for w in ["bow", "spear", "dagger", "quarterstaff", "naturestaff"]):
                    journal_type = "fletcher"
                elif any(w in normalized_subcat for w in ["firestaff", "froststaff", "arcanestaff", "holystaff", "cursedstaff"]):
                    journal_type = "imbuer"
            elif broad_cat in ["equipment", "armors"]:
                if "plate" in normalized_subcat or "plate" in uname.lower():
                    journal_type = "blacksmith"
                elif "leather" in normalized_subcat or "leather" in uname.lower():
                    journal_type = "fletcher"
                elif "cloth" in normalized_subcat or "cloth" in uname.lower():
                    journal_type = "imbuer"
                elif "bag" in uname.lower() or "cape" in uname.lower():
                    journal_type = "tinker"
            elif broad_cat == "tools":
                journal_type = "tinker"

            names = name_map.get(uname, { "en": uname, "pl": uname })
            api_pattern = "equipment" if not is_refining else "refining"

            item_entry = {
                "id": uname,
                "name": names["en"],
                "name_pl": names["pl"],
                "tier": tier,
                "category": broad_cat,
                "subcategory": normalized_subcat,
                "slot": slot,
                "itemValue": item_val,
                "craftingFame": fame,
                "weight": round(weight, 2),
                "journalType": journal_type,
                "apiPattern": api_pattern,
                "recipes": recipes
            }

            craftable_items.append(item_entry)

    print(f"Extracted {len(craftable_items)} craftable items.")

    city_bonuses = {
        "Fort Sterling": {
            "refining": ["wood"],
            "crafting": ["hammer", "spear", "holystaff", "cloth_armor", "plate_helmet"]
        },
        "Thetford": {
            "refining": ["ore"],
            "crafting": ["mace", "firestaff", "bow", "leather_armor", "cloth_helmet"]
        },
        "Lymhurst": {
            "refining": ["fiber"],
            "crafting": ["sword", "bow", "arcanestaff", "leather_helmet", "plate_shoes"]
        },
        "Bridgewatch": {
            "refining": ["stone", "rock"],
            "crafting": ["crossbow", "dagger", "cursedstaff", "plate_armor", "cloth_shoes"]
        },
        "Martlock": {
            "refining": ["hide"],
            "crafting": ["axe", "quarterstaff", "froststaff", "plate_shield", "leather_shoes"]
        },
        "Caerleon": {
            "refining": [],
            "crafting": ["tool", "gathering_gear", "cape", "potion", "food"]
        },
        "Brecilien": {
            "refining": [],
            "crafting": ["cape", "bag", "potion"]
        }
    }

    journals_info = {
        "blacksmith": {
            "T4": { "empty": "T4_JOURNAL_WARRIOR_EMPTY", "full": "T4_JOURNAL_WARRIOR_FULL", "fame": 1800 },
            "T5": { "empty": "T5_JOURNAL_WARRIOR_EMPTY", "full": "T5_JOURNAL_WARRIOR_FULL", "fame": 3600 },
            "T6": { "empty": "T6_JOURNAL_WARRIOR_EMPTY", "full": "T6_JOURNAL_WARRIOR_FULL", "fame": 7200 },
            "T7": { "empty": "T7_JOURNAL_WARRIOR_EMPTY", "full": "T7_JOURNAL_WARRIOR_FULL", "fame": 14400 },
            "T8": { "empty": "T8_JOURNAL_WARRIOR_EMPTY", "full": "T8_JOURNAL_WARRIOR_FULL", "fame": 28800 }
        },
        "fletcher": {
            "T4": { "empty": "T4_JOURNAL_HUNTER_EMPTY", "full": "T4_JOURNAL_HUNTER_FULL", "fame": 1800 },
            "T5": { "empty": "T5_JOURNAL_HUNTER_EMPTY", "full": "T5_JOURNAL_HUNTER_FULL", "fame": 3600 },
            "T6": { "empty": "T6_JOURNAL_HUNTER_EMPTY", "full": "T6_JOURNAL_HUNTER_FULL", "fame": 7200 },
            "T7": { "empty": "T7_JOURNAL_HUNTER_EMPTY", "full": "T7_JOURNAL_HUNTER_FULL", "fame": 14400 },
            "T8": { "empty": "T8_JOURNAL_HUNTER_EMPTY", "full": "T8_JOURNAL_HUNTER_FULL", "fame": 28800 }
        },
        "imbuer": {
            "T4": { "empty": "T4_JOURNAL_MAGE_EMPTY", "full": "T4_JOURNAL_MAGE_FULL", "fame": 1800 },
            "T5": { "empty": "T5_JOURNAL_MAGE_EMPTY", "full": "T5_JOURNAL_MAGE_FULL", "fame": 3600 },
            "T6": { "empty": "T6_JOURNAL_MAGE_EMPTY", "full": "T6_JOURNAL_MAGE_FULL", "fame": 7200 },
            "T7": { "empty": "T7_JOURNAL_MAGE_EMPTY", "full": "T7_JOURNAL_MAGE_FULL", "fame": 14400 },
            "T8": { "empty": "T8_JOURNAL_MAGE_EMPTY", "full": "T8_JOURNAL_MAGE_FULL", "fame": 28800 }
        },
        "tinker": {
            "T4": { "empty": "T4_JOURNAL_TOOLMAKER_EMPTY", "full": "T4_JOURNAL_TOOLMAKER_FULL", "fame": 1800 },
            "T5": { "empty": "T5_JOURNAL_TOOLMAKER_EMPTY", "full": "T5_JOURNAL_TOOLMAKER_FULL", "fame": 3600 },
            "T6": { "empty": "T6_JOURNAL_TOOLMAKER_EMPTY", "full": "T6_JOURNAL_TOOLMAKER_FULL", "fame": 7200 },
            "T7": { "empty": "T7_JOURNAL_TOOLMAKER_EMPTY", "full": "T7_JOURNAL_TOOLMAKER_FULL", "fame": 14400 },
            "T8": { "empty": "T8_JOURNAL_TOOLMAKER_EMPTY", "full": "T8_JOURNAL_TOOLMAKER_FULL", "fame": 28800 }
        }
    }

    output_data = {
        "version": "1.0",
        "itemCount": len(craftable_items),
        "cityBonuses": city_bonuses,
        "journals": journals_info,
        "items": craftable_items
    }

    print(f"Saving compiled database to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, separators=(',', ':'))
    
    file_size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
    print(f"SUCCESS: Saved {len(craftable_items)} items to {OUTPUT_PATH} ({file_size_mb:.2f} MB)")

if __name__ == "__main__":
    run_extraction()
