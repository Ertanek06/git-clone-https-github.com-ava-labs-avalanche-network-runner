import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { createSessionStore } from "../src/services/session-store.service.js";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"crm-session-store-"));
const appDb=path.join(root,"app.sqlite");
const sessionDb=path.join(root,"sessions.sqlite");
const legacy=new Database(sessionDb);
legacy.exec("CREATE TABLE sessions(sid TEXT PRIMARY KEY,expired INTEGER NOT NULL,sess TEXT NOT NULL)");
legacy.prepare("INSERT INTO sessions(sid,expired,sess) VALUES(?,?,?)").run("legacy",Date.now()+60_000,JSON.stringify({user:{id:"u1"},cookie:{maxAge:60_000}}));
legacy.close();

const store=createSessionStore(appDb);
const call=(method,...args)=>new Promise((resolve,reject)=>store[method](...args,(error,value)=>error?reject(error):resolve(value)));

try{
  assert.equal((await call("get","legacy")).user.id,"u1");
  await call("set","fresh",{user:{id:"u2"},cookie:{originalMaxAge:120_000}});
  assert.equal((await call("get","fresh")).user.id,"u2");
  await call("touch","fresh",{user:{id:"u2"},cookie:{originalMaxAge:240_000}});
  assert.equal(await call("length"),2);
  await call("destroy","fresh");
  assert.equal(await call("get","fresh"),null);
  assert.equal(await call("length"),1);
  console.log("SESSION_STORE_TESTS=7/7 OK");
}finally{
  store.close();
  fs.rmSync(root,{recursive:true,force:true});
}
