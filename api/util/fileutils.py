import pathlib

def getFileExt(filename:str) :
    return pathlib.Path(filename).suffix

# data:@file/png;base64,ffdkljafldsajflkjdsaklfjsaldkjflasdkj...
def getMimeType(base64:str) :
    # data:image/png;
    head = base64.split(";")[0]
    mimeType = head.split(":")[1]
    return mimeType
