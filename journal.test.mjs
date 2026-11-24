import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseJournal} from './app.mjs';
const data=parseJournal(readFileSync(new URL('./FOOD_TRACKER.md',import.meta.url),'utf8'));
test('loads goals and newest date first',()=>{assert.equal(data.calorieGoal,1900);assert.equal(data.proteinGoal,140);assert.equal(data.days[0].date,'2026-11-24')});
test('November 24 excludes shake, includes both Rebisco packets, keeps beer planned',()=>{const day=data.days.find(d=>d.date==='2026-11-24');assert.deepEqual(day.total,{kcal:1745,protein:136,carbs:143,fat:69});assert.equal(day.planned.kcal,280);assert.equal(day.rows.find(r=>r.name.includes('protein shake')).status,'excluded');assert.equal(day.rows.find(r=>r.name.includes('Red Horse')).status,'planned')});
test('November 23 separates actual and planned intake',()=>{const day=data.days.find(d=>d.date==='2026-11-23');assert.equal(day.total.kcal,1135);assert.equal(day.planned.kcal,730);assert.equal(day.total.protein,84)});
