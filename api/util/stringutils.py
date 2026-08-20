import hashlib
import re

from util import timeutils, numberutils

def generate_hash(word:str) :
    sha = hashlib.new('md5')
    encoded = word.encode('utf-8')
    sha.update(encoded)
    return sha.hexdigest()

def generate_file_prefix() :
    return generate_hash(str(numberutils.generate_random_number()))
