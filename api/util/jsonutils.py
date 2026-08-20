import json

def is_json(obj):
    try:
        json_object = json.loads(obj)
        # { } 가 포함된 string이 invalid json 인 경우 Exception
        iterator = iter(json_object)
        # { } 가 없는 경우는 string의 경우 Exception
    except Exception as e:
        return False
    return True

def to_json(json_string):
    if is_json(json_string) :
        return json.loads(json_string)
    return json_string

def to_string(json_object) :
    return json.dumps(json_object, ensure_ascii=False)