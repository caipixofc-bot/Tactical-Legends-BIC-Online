import express from "express";
import http from "http";
import { Server } from "socket.io";
import Database from "better-sqlite3";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
const db = new Database(path.join(__dirname, "progress.db"));

db.exec(`
CREATE TABLE IF NOT EXISTS players(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const getPlayer = db.prepare("SELECT * FROM players WHERE id=?");
const createPlayer = db.prepare("INSERT INTO players(id,name) VALUES(?,?)");
const savePlayer = db.prepare(`
  UPDATE players SET name=?, level=?, xp=?, kills=?, deaths=?, wins=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
`);

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_, res) => res.json({ok:true, online:true}));

const rooms = new Map();
const room = () => {
  for (const r of rooms.values()) if (r.players.size < 8) return r;
  const id = crypto.randomUUID().slice(0,8);
  const r = { id, players: new Map(), created: Date.now() };
  rooms.set(id,r); return r;
};

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ensureProfile(id,name){
  let p=getPlayer.get(id);
  if(!p){ createPlayer.run(id,name.slice(0,18)||"Player"); p=getPlayer.get(id); }
  return p;
}
function publicProfile(p){
  return {name:p.name,level:p.level,xp:p.xp,kills:p.kills,deaths:p.deaths,wins:p.wins};
}
function addXp(p, amount){
  let xp=p.xp+amount, level=p.level;
  while(xp >= level*100){ xp-=level*100; level++; }
  p.level=level; p.xp=xp;
}

io.on("connection", socket=>{
  socket.on("login", ({id,name})=>{
    id=(id||crypto.randomUUID()).slice(0,64);
    const p=ensureProfile(id,name||"Player");
    socket.data.playerId=id; socket.data.profile=p;
    socket.emit("profile",publicProfile(p));

    const r=room();
    socket.data.roomId=r.id;
    r.players.set(socket.id,{id,name:p.name,x:400+Math.random()*600,y:260+Math.random()*300,angle:0,hp:100,score:0});
    socket.join(r.id);
    socket.emit("room",{id:r.id});
    io.to(r.id).emit("players", [...r.players.values()]);
    io.to(r.id).emit("system","Jugador "+p.name+" entró en la partida.");
  });

  socket.on("state", s=>{
    const r=rooms.get(socket.data.roomId), me=r?.players.get(socket.id);
    if(!me) return;
    me.x=clamp(Number(s.x)||me.x,40,1560); me.y=clamp(Number(s.y)||me.y,150,850);
    me.angle=Number(s.angle)||0; me.hp=clamp(Number(s.hp)||0,0,100);
    me.score=Number(s.score)||0;
    socket.to(r.id).emit("playerState",me);
  });

  socket.on("shoot", ({targetId})=>{
    const r=rooms.get(socket.data.roomId), me=r?.players.get(socket.id), target=r?.players.get(targetId);
    if(!me||!target||target.id===me.id||target.hp<=0) return;
    target.hp-=34;
    io.to(r.id).emit("hit",{from:me.id,target:target.id,hp:target.hp});
    if(target.hp<=0){
      me.score++; target.hp=0;
      const killer=getPlayer.get(me.id), victim=getPlayer.get(target.id);
      if(killer){ addXp(killer,50); killer.kills++; savePlayer.run(killer.name,killer.level,killer.xp,killer.kills,killer.deaths,killer.wins,killer.id); }
      if(victim){ victim.deaths++; savePlayer.run(victim.name,victim.level,victim.xp,victim.kills,victim.deaths,victim.wins,victim.id); }
      io.to(r.id).emit("elimination",{killer:me.name,victim:target.name});
      setTimeout(()=>{ target.hp=100; target.x=400+Math.random()*600; target.y=260+Math.random()*300; },1200);
    }
  });

  socket.on("chat", text=>{
    text=String(text||"").trim().slice(0,180);
    if(!text) return;
    const r=rooms.get(socket.data.roomId); if(!r) return;
    io.to(r.id).emit("chat",{name:socket.data.profile.name,text,at:Date.now()});
  });

  socket.on("disconnect",()=>{
    const r=rooms.get(socket.data.roomId);
    if(r){ const p=r.players.get(socket.id); r.players.delete(socket.id);
      io.to(r.id).emit("players",[...r.players.values()]);
      if(r.players.size===0) rooms.delete(r.id);
    }
  });
});

setInterval(()=>{
  for(const r of rooms.values()) io.to(r.id).emit("players",[...r.players.values()]);
}, 250);

const PORT=process.env.PORT||3000;
httpServer.listen(PORT,()=>console.log(`Tactical Legends BIC Online running on :${PORT}`));
