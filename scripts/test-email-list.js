import assert from 'node:assert/strict';
import { parseEmailList,emailListText } from '../src/utils/email-list.js';

assert.deepEqual(parseEmailList('a@example.com; b@example.com.tr, A@example.com'),['a@example.com','b@example.com.tr']);
assert.deepEqual(parseEmailList(['a@example.com','b@example.org']),['a@example.com','b@example.org']);
assert.equal(emailListText('a@example.com b@example.net'),'a@example.com, b@example.net');
assert.throws(()=>parseEmailList('',{required:true,label:'Kime'}),/en az bir/);
assert.throws(()=>parseEmailList('gecersiz',{label:'Bilgi'}),/geçersiz/);
assert.throws(()=>parseEmailList('a@example.com,b@example.com',{max:1}),/en fazla 1/);
console.log('EMAIL_LIST_TESTS=6/6 OK');
