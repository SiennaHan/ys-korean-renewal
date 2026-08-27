from fastapi import APIRouter, Depends, HTTPException

from accepter import auth
from accepter.entitlement_guard import RequireGame
from accepter.base import makeResponse
from accepter.game_content_models import (
    CardSortCategoryCreate,
    CardSortCategoryUpdate,
    CardSortRareCreate,
    CardSortRareUpdate,
    CardSortVocabCreate,
    CardSortVocabUpdate,
)
from business import card_sort

router = APIRouter()


@router.get("/categories", dependencies=[Depends(RequireGame("card-sort"))])
async def list_categories():
    return makeResponse(await card_sort.getCategories())


@router.get("/vocab", dependencies=[Depends(RequireGame("card-sort"))])
async def list_vocab():
    return makeResponse(await card_sort.getVocab())


@router.get("/rare", dependencies=[Depends(RequireGame("card-sort"))])
async def list_rare():
    return makeResponse(await card_sort.getRare())


@router.get("/categories/edit", dependencies=[Depends(auth.MasterAdminRequired())])
async def list_categories_for_edit():
    return makeResponse(await card_sort.listCategoriesForEdit())


@router.get("/vocab/edit", dependencies=[Depends(auth.MasterAdminRequired())])
async def list_vocab_for_edit():
    return makeResponse(await card_sort.listVocabForEdit())


@router.get("/rare/edit", dependencies=[Depends(auth.MasterAdminRequired())])
async def list_rare_for_edit():
    return makeResponse(await card_sort.listRareForEdit())


@router.post("/categories", dependencies=[Depends(auth.MasterAdminRequired())])
async def create_category(payload: CardSortCategoryCreate):
    result, err = await card_sort.createCategory(payload.model_dump())
    if err is not None:
        raise HTTPException(status_code=400, detail=err)
    return makeResponse(result)


@router.post("/vocab", dependencies=[Depends(auth.MasterAdminRequired())])
async def create_vocab(payload: CardSortVocabCreate):
    result, err = await card_sort.createVocab(payload.model_dump())
    if err is not None:
        raise HTTPException(status_code=400, detail=err)
    return makeResponse(result)


@router.post("/rare", dependencies=[Depends(auth.MasterAdminRequired())])
async def create_rare(payload: CardSortRareCreate):
    result, err = await card_sort.createRare(payload.model_dump())
    if err is not None:
        raise HTTPException(status_code=400, detail=err)
    return makeResponse(result)


@router.patch("/categories/{name}", dependencies=[Depends(auth.MasterAdminRequired())])
async def update_category(name: str, payload: CardSortCategoryUpdate):
    result = await card_sort.updateCategory(
        name, payload.model_dump(exclude_unset=True),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="category not found")
    return makeResponse(result)


@router.patch("/vocab/{vocab_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def update_vocab(vocab_id: int, payload: CardSortVocabUpdate):
    result = await card_sort.updateVocab(
        vocab_id, payload.model_dump(exclude_unset=True),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="vocab not found")
    return makeResponse(result)


@router.patch("/rare/{word}", dependencies=[Depends(auth.MasterAdminRequired())])
async def update_rare(word: str, payload: CardSortRareUpdate):
    result = await card_sort.updateRare(
        word, payload.model_dump(exclude_unset=True),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="rare example not found")
    return makeResponse(result)


@router.delete("/categories/{name}", dependencies=[Depends(auth.MasterAdminRequired())])
async def delete_category(name: str):
    ok = await card_sort.deleteCategory(name)
    if not ok:
        raise HTTPException(status_code=404, detail="category not found")
    return makeResponse({"name": name})


@router.delete("/vocab/{vocab_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def delete_vocab(vocab_id: int):
    ok = await card_sort.deleteVocab(vocab_id)
    if not ok:
        raise HTTPException(status_code=404, detail="vocab not found")
    return makeResponse({"id": vocab_id})


@router.delete("/rare/{word}", dependencies=[Depends(auth.MasterAdminRequired())])
async def delete_rare(word: str):
    ok = await card_sort.deleteRare(word)
    if not ok:
        raise HTTPException(status_code=404, detail="rare example not found")
    return makeResponse({"word": word})
