from fastapi import FastAPI, HTTPException, Header, Depends, Security, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from typing import Optional, List
import json
from .core import LibCore, process_universal_proxy

app = FastAPI(
    title="ZJU Library API", 
    description="浙大图书馆预约无状态后端接口。登录后返回 Token，后续请求在 Header 的 Authorization 中携带此 Token。",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],  # 允许所有请求方法 (GET, POST 等)
    allow_headers=["*"],  # 允许所有请求头
)

api_key_header = APIKeyHeader(name="authorization", auto_error=False)

class LoginRequest(BaseModel):
    username: str
    password: str

class ReserveRequest(BaseModel):
    seat_id: str
    segment: str

class CancelRequest(BaseModel):
    id: str
    type: int  # 1: 座位, 2: 研讨室

class PowerRequest(BaseModel):
    req: CancelRequest
    area_id: str
    status: int

class LightRequest(BaseModel):
    req: CancelRequest
    area_id: str
    status: int
    is_turn: bool

class RoomListRequest(BaseModel):
    page: int = 1

class RoomOccupancyRequest(BaseModel):
    room_id: str
    area: str

class BookRoomRequest(BaseModel):
    day: str
    start_time: str
    end_time: str
    title: str
    content: str
    mobile: str
    room: str
    open: str
    teamusers: str

def get_lib_core(auth_token: str = Security(api_key_header)):
    if not auth_token:
        raise HTTPException(status_code=401, detail="请求未携带有效的 Authorization Token。")
    # 无状态设计：每次请求都会用前端传来的 Token 初始化 LibCore
    return LibCore(authorization=auth_token)

@app.post("/login")
async def login(req: LoginRequest):
    lib = LibCore()
    if lib.login(req.username, req.password):
        # 登录成功，直接返回真实的 Bearer Token 给前端保存
        return {"token": lib.authorization, "msg": "登录成功，请在后续请求 Header 中携带此 token。"}
    else:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

@app.get("/user")
async def get_user(lib: LibCore = Depends(get_lib_core)):
    name = lib.get_user_info()
    if not name:
        raise HTTPException(status_code=401, detail="Token已过期或在其他设备登录")
    return name

@app.post("/notices")
async def get_notices(req: dict, lib: LibCore = Depends(get_lib_core)):
    return lib.get_notices(limit=req.get("limit", 3), page=req.get("page", 1))

@app.post("/noticeDetail")
async def get_notice_detail(req: dict, lib: LibCore = Depends(get_lib_core)):
    return lib.get_notice_detail(notice_id=req.get("id"))

@app.get("/rules")
async def get_rules(lib: LibCore = Depends(get_lib_core)):
    res = lib.get_booking_rules()
    if res.get("code") != 1:
        raise HTTPException(status_code=400, detail=res.get("msg", "获取规则失败"))
    return res.get("data", {})

@app.get("/venues")
async def get_venues(date: Optional[str] = None, lib: LibCore = Depends(get_lib_core)):
    return lib.get_venues(date)

@app.get("/seats/{area_id}")
async def get_seats(area_id: str, lib: LibCore = Depends(get_lib_core)):
    data = lib.get_seats(area_id)
    if not data:
        raise HTTPException(status_code=404, detail="未找到该区域座位信息")
    return data

@app.post("/seats/book")
async def reserve_seat(req: ReserveRequest, lib: LibCore = Depends(get_lib_core)):
    return lib.book_seat(req.seat_id, req.segment)

@app.get("/reservations")
async def list_reservations(lib: LibCore = Depends(get_lib_core)):
    return lib.get_reservations()

@app.post("/cancel")
async def cancel(req: CancelRequest, lib: LibCore = Depends(get_lib_core)):
    return lib.cancel_reservation(req.id, req.type)

@app.post("/seats/leave")
async def temp_leave(req: CancelRequest, lib: LibCore = Depends(get_lib_core)):
    if req.type != 1:
        raise HTTPException(status_code=400, detail="临时离开仅适用于座位预约")
    return lib.seat_leave(req.id)

@app.post("/seats/return")
async def return_seat(req: CancelRequest, lib: LibCore = Depends(get_lib_core)):
    if req.type != 1:
        raise HTTPException(status_code=400, detail="结束使用仅适用于座位预约")
    return lib.seat_return(req.id)

@app.post("/seats/checkout")
async def checkout_seat(req: CancelRequest, lib: LibCore = Depends(get_lib_core)):
    if req.type != 1:
        raise HTTPException(status_code=400, detail="离开座位仅适用于座位预约")
    return lib.seat_checkout(req.id)

@app.post("/seats/set_power")
async def set_power(data: PowerRequest, lib: LibCore = Depends(get_lib_core)):
    if data.req.type != 1:
        raise HTTPException(status_code=400, detail="设置电源仅适用于座位预约")
    return lib.seat_set_power(data.req.id, data.area_id, data.status)

@app.post("/seats/set_light")
async def set_light(data: LightRequest, lib: LibCore = Depends(get_lib_core)):
    if data.req.type != 1:
        raise HTTPException(status_code=400, detail="设置灯光仅适用于座位预约")
    return lib.seat_set_light(data.req.id, data.area_id, data.status, data.is_turn)

@app.get("/name/{card}")
async def get_name(card: str, area: str, beginTime: str, endTime: str, lib: LibCore = Depends(get_lib_core)):
    return lib.get_name(card, area, beginTime, endTime)

@app.post("/room_list")
async def get_room_list(req: RoomListRequest, lib: LibCore = Depends(get_lib_core)):
    return lib.get_room_list(page=req.page)

@app.post("/room_occupancy")
async def get_room_occupancy(req: RoomOccupancyRequest, lib: LibCore = Depends(get_lib_core)):
    return lib.get_room_occupancy(room_id=req.room_id, area=req.area)

@app.post("/room/book")
async def book_room(req: BookRoomRequest, lib: LibCore = Depends(get_lib_core)):
    return lib.book_room(
        day=req.day,
        start_time=req.start_time,
        end_time=req.end_time,
        title=req.title,
        content=req.content,
        mobile=req.mobile,
        area=req.room,
        is_open=req.open,
        teamusers=req.teamusers
    )

@app.api_route("/proxy/{target_url:path}", methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"])
async def universal_proxy_endpoint(target_url: str, request: Request):
    return await process_universal_proxy(target_url, request)

@app.api_route("/searchbook/{path:path}", methods=["GET", "POST", "OPTIONS"])
async def fallback_searchbook(path: str, request: Request):
    return await process_universal_proxy(f"http://bis.lib.zju.edu.cn:8003/searchbook/{path}", request)

@app.api_route("/data/{path:path}", methods=["GET", "POST", "OPTIONS"])
async def fallback_data(path: str, request: Request):
    return await process_universal_proxy(f"http://bis.lib.zju.edu.cn:8003/data/{path}", request)

@app.api_route("/scripts/{path:path}", methods=["GET", "POST", "OPTIONS"])
async def fallback_scripts(path: str, request: Request):
    return await process_universal_proxy(f"http://bis.lib.zju.edu.cn:8003/scripts/{path}", request)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)