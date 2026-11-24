import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseJournal} from './app.mjs';
const data=parseJournal(readFileSync(new URL('./FOOD_TRACKER.md',import.meta.url),'utf8'));
test('loads goals and newest date first',()=>{assert.equal(data.calorieGoal,1900);assert.equal(data.proteinGoal,140);assert.equal(data.days[0].date,'2026-11-24')});
test('November 24 excludes shake and includes both Rebisco packets and Red Horse',()=>{const day=data.days.find(d=>d.date==='2026-11-24');assert.deepEqual(day.total,{kcal:2025,protein:136,carbs:143,fat:69});assert.equal(day.planned.kcal,0);assert.equal(day.rows.find(r=>r.name.includes('protein shake')).status,'excluded');assert.equal(day.rows.find(r=>r.name.includes('Red Horse')).status,'eaten')});
test('November 23 includes confirmed dinner and eight kwek-kwek',()=>{const day=data.days.find(d=>d.date==='2026-11-23');assert.deepEqual(day.total,{kcal:1865,protein:130,carbs:124,fat:93});assert.equal(day.planned.kcal,0);assert.equal(day.rows.find(r=>r.name.includes('Kwek-kwek')).status,'eaten');assert.equal(day.rows.find(r=>r.name.includes('tortilla wraps')).status,'eaten')});
test('morning weigh-ins are dated and sorted without inventing measurements',()=>{const sample='## Morning weigh-ins\n| Date | Weight (kg) |\n|---|---:|\n| 2026-11-25 | 73.1 |\n| 2026-11-26 | 72.9 |';assert.deepEqual(parseJournal(sample).weighIns,[{date:'2026-11-26',kg:72.9},{date:'2026-11-25',kg:73.1}]);assert.deepEqual(data.weighIns,[])});
