const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'argentine-2027.html'), 'utf8');
const extract = id => html.match(new RegExp('<script id="' + id + '"[^>]*>([\\s\\S]*?)<\\/script>'))[1];
const DATA = JSON.parse(extract('trip-data'));
const PHOTOS = JSON.parse(extract('photo-data'));
const E = vm.runInNewContext(extract('trip-engine') + '\nTripEngine;', { DATA });
const plain = x => JSON.parse(JSON.stringify(x));
const template = id => DATA.templates.find(t => t.id === id);
const backup = state => ({ format: 'argentine-a9', version: 1, state });

test('50 destinations avec galeries autonomes, licences et activités', () => {
  const places = DATA.destinations.filter(d => !d.hidden);
  assert.equal(places.length, 50);
  for (const d of places) {
    const images = PHOTOS[d.id]?.images;
    assert.ok(images?.length >= 3 && images.length <= 4, d.id + ' : 3–4 photos');
    assert.equal(new Set(images.map(p => p.data)).size, images.length, d.id + ' : images distinctes');
    for (const p of images) {
      assert.ok(p.data.startsWith('data:image/webp;base64,'), d.id);
      assert.ok(p.author && p.title && p.url && p.license, d.id);
      assert.notEqual(p.license, 'Voir la source', d.id);
      const bytes=Buffer.from(p.data.split(',')[1], 'base64');
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    }
    assert.ok(d.activities.length >= 3, d.id);
  }
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(!/<(?:script|link|img)[^>]+(?:src|href)="https?:/.test(html));
});

test('9 profils vierges, dates et absence de faux votes', () => {
  const s = E.defaultState();
  assert.equal(s.profiles.length, 9);
  assert.equal(E.nightsBetween(s.settings.arrival, s.settings.departure), 12);
  assert.equal(E.votesFor(s, 'mendoza').average, null);
  assert.equal(E.affinity(s, [{ id: 'mendoza', nights: 3 }]).score, null);
});

test('la moyenne ignore les votes manquants et expose les désaccords', () => {
  const s = E.defaultState();
  s.profiles[0].votes.mendoza = 5;
  assert.equal(E.votesFor(s, 'mendoza').average, 5);
  s.profiles[1].votes.mendoza = 1;
  const v = E.votesFor(s, 'mendoza');
  assert.equal(v.average, 3);
  assert.equal(v.count, 2);
  assert.equal(v.spread, 4);
});

test('un vote explicite prime sur les thèmes, y compris un refus', () => {
  const s = E.defaultState(), p = s.profiles[0];
  p.themes = { food: 3, nature: 3, culture: 3 };
  assert.equal(E.placeScore(p, 'mendoza'), 1);
  p.votes.mendoza = 1;
  assert.equal(E.placeScore(p, 'mendoza'), 0);
  delete p.votes.mendoza;
  p.themes = { culture: 0 };
  assert.equal(E.hasAnswered(p), true);
  assert.equal(E.placeScore(p, 'mendoza'), 0);
});

test('chaque répondant a le même poids, indépendamment du nombre de votes', () => {
  const s = E.defaultState();
  s.profiles[0].votes = { mendoza: 5, tigre: 5, ibera: 5 };
  s.profiles[1].votes = { mendoza: 1 };
  const a = E.affinity(s, [{ id: 'mendoza', nights: 3 }]);
  assert.equal(a.score, 0.5);
  assert.equal(a.responses.length, 2);
});

test('les propositions par défaut respectent nuits, dates, conduite et retour', () => {
  const s = E.defaultState(), result = E.suggestions(s);
  assert.equal(result.valid.length, 3);
  assert.equal(new Set(result.valid.map(r => r.templateId)).size, 3);
  for (const r of result.all) {
    const a = r.assessment;
    assert.equal(a.feasible, true, r.templateId);
    assert.equal(a.totalNights, 12);
    assert.equal(a.days.length, 12);
    assert.equal(a.days[0].date, '2027-02-04');
    assert.equal(a.days.at(-1).date, '2027-02-15');
    assert.equal(a.lastArrival, '2027-02-15');
    assert.equal(r.stops[0].id, 'ba');
    assert.equal(r.stops.at(-1).id, 'ba');
    assert.ok(a.segments.every(l => l.minutes <= 300));
    assert.ok(a.days.every(d => d.drive <= 300));
    assert.equal(new Set(a.days.map(d => d.date)).size, 12);
    assert.ok(a.km > 0);
  }
});

test('le classement change avec les préférences et un vœu éloigné est exclu', () => {
  const s = E.defaultState();
  const before = E.suggestions(s).valid[0].templateId;
  for (const p of s.profiles) p.votes.ibera = 5;
  const after = E.suggestions(s).valid[0].templateId;
  assert.notEqual(before, after);
  assert.equal(after, 'ibera');
  for (const p of s.profiles) p.votes.ushuaia = 5;
  for (const r of E.suggestions(s).valid) assert.ok(!r.stops.some(s => s.id === 'ushuaia'));
});

test('Cuyo devient compatible seulement avec une limite suffisante', () => {
  const s = E.defaultState();
  assert.ok(E.suggestions(s).rejected.some(r => r.templateId === 'cuyo'));
  s.settings.maxDrive = 6;
  assert.ok(E.suggestions(s).all.some(r => r.templateId === 'cuyo'));
});

test('ne pas inventer trois circuits si la durée ou la conduite est trop limitée', () => {
  const s = E.defaultState();
  s.settings.maxDrive = 1;
  assert.equal(E.suggestions(s).valid.length, 0);
  s.settings.maxDrive = 5;
  s.settings.departure = '2027-02-07';
  assert.equal(E.suggestions(s).valid.length, 0);
});

test('les modifications signalent les nuits manquantes, excédentaires et minimales', () => {
  const s = E.defaultState(), r = E.allocate(s, template('cote'));
  r.stops[2].nights += 1;
  assert.ok(E.evaluate(s, r).errors.some(x => x.includes('en trop')));
  r.stops[2].nights = 1;
  assert.ok(E.evaluate(s, r).errors.some(x => x.includes('au moins 2')));
  assert.equal(E.evaluate(s, r).feasible, false);
  const balanced = E.allocate(s, template('cote'), r.stops.map(s => s.id));
  assert.equal(E.evaluate(s, balanced).feasible, true);
});

test('remplacer une étape recalcule ses deux trajets, sans symétrie artificielle', () => {
  const s = E.defaultState(), r = E.allocate(s, template('cote'));
  r.stops[2].id = 'carilo';
  assert.equal(E.evaluate(s, r).feasible, true);
  r.stops[3].id = 'necochea';
  assert.equal(E.evaluate(s, r).feasible, false);
  s.settings.maxDrive = 5.5;
  assert.equal(E.evaluate(s, r).feasible, true);
  assert.notEqual(E.leg('ba', 'colon').minutes, E.leg('colon', 'ba').minutes);
});

test('tous les trajets des variantes sont documentés et les pauses séparées', () => {
  for (const t of DATA.templates) for (let i = 1; i < t.stops.length; i++) {
    for (const a of [t.stops[i - 1].id, ...t.stops[i - 1].alternatives]) {
      for (const b of [t.stops[i].id, ...t.stops[i].alternatives]) {
        assert.ok(E.leg(a, b), `${a} → ${b}`);
        assert.ok(E.leg(a, b).minutes >= E.leg(a, b).baseMinutes);
      }
    }
  }
  assert.equal(E.breaks(119), 0);
  assert.equal(E.breaks(240), 40);
});

test('dates UTC stables et paramètres de dates invalides rejetés', () => {
  assert.equal(E.plusDays('2027-02-28', 1), '2027-03-01');
  const s = E.defaultState();
  assert.equal(E.settingsErrors(s.settings).length, 0);
  for (const settings of [
    { ...s.settings, arrival: '2027-02-30' },
    { ...s.settings, departure: '2027-02-03' },
    { ...s.settings, departure: '2027-02-18' },
    { ...s.settings, maxDrive: 0 },
    { ...s.settings, maxDrive: NaN }
  ]) assert.ok(E.settingsErrors(settings).length);
});

test('export et import préservent exactement les neuf profils, le carnet et les notes', () => {
  const s = E.defaultState();
  s.profiles.forEach((p, i) => { p.name = `Ami ${i + 1}`; p.themes.nature = i % 4; p.votes.ba = i % 5 + 1; });
  s.active = 'p9';
  s.notes = 'Deux voitures ?\nVérifier les bagages.';
  s.selected = E.allocate(s, template('delta'));
  assert.deepEqual(plain(E.parseBackup(JSON.parse(JSON.stringify(backup(s))))), plain(s));
});

test('une sauvegarde invalide ne doit pas être appliquée partiellement', () => {
  const s = E.defaultState();
  const malformed = [null, {}, { ...backup(s), version: 99 }];
  const badCount = plain(backup(s)); badCount.state.profiles.pop(); malformed.push(badCount);
  const badVote = plain(backup(s)); badVote.state.profiles[0].votes.ba = 6; malformed.push(badVote);
  const badPlace = plain(backup(s)); badPlace.state.profiles[0].votes.fake = 3; malformed.push(badPlace);
  const badNight = plain(backup(s)); badNight.state.selected = E.allocate(s, template('delta')); badNight.state.selected.stops[0].nights = 0; malformed.push(badNight);
  for (const item of malformed) assert.throws(() => E.parseBackup(item));
});


test('12 circuits consultables, compatibles en premier et trois favoris seulement', () => {
  const result=E.suggestions(E.defaultState());
  assert.equal(DATA.templates.length, 12);
  assert.equal(result.catalog.length, 12);
  assert.equal(result.all.length, 8);
  assert.equal(result.valid.length, 3);
  assert.equal(new Set(result.catalog.map(r=>r.templateId)).size,12);
  assert.ok(result.catalog.slice(0,8).every(r=>r.assessment.feasible));
  assert.ok(result.catalog.slice(8).every(r=>!r.assessment.feasible));
  for (const id of ['cote_nature','fleuve_parana','entre_rios']) assert.ok(result.all.some(r=>r.templateId===id));
  for (const id of ['missions_iguazu','nord_salta','lacs_patagonie']) {
    const r=result.catalog.find(r=>r.templateId===id);
    assert.ok(!r.assessment.feasible);
    assert.ok(r.assessment.errors.some(e=>e.includes('en trop')));
    assert.ok(r.assessment.errors.some(e=>e.includes('conduite')));
  }
});

test('les circuits lointains sont recalculés après changement des contraintes', () => {
  const s=E.defaultState();
  s.settings={arrival:'2027-02-03',departure:'2027-02-17',maxDrive:8,confirmed:true};
  const result=E.suggestions(s);
  for(const id of ['missions_iguazu','nord_salta','lacs_patagonie']) {
    const r=result.all.find(r=>r.templateId===id);
    assert.ok(r,id);
    assert.equal(r.assessment.totalNights,14);
    assert.equal(r.assessment.lastArrival,'2027-02-16');
  }
  s.settings.maxDrive=1;
  assert.equal(E.suggestions(s).catalog.length,12);
  assert.equal(E.suggestions(s).valid.length,0);
});

test('un trajet manquant reste incompatible et est expliqué', () => {
  const data=plain(DATA);delete data.legs['ba|tigre'];
  const isolated=vm.runInNewContext(extract('trip-engine')+'\nTripEngine;', {DATA:data});
  const state=isolated.defaultState();
  const r=isolated.allocate(state,template('fleuve_parana'));
  assert.ok(isolated.evaluate(state,r).errors.some(e=>e.includes('Trajet non documenté')));
  assert.equal(isolated.evaluate(state,r).feasible,false);
});

test('les anciennes sauvegardes version 1 conservent profils et circuits', () => {
  const old=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures','argentine-v1.json'),'utf8'));
  const imported=E.parseBackup(old);
  assert.deepEqual(plain(imported),old.state);
  assert.ok(E.evaluate(imported,imported.selected).feasible);
  const exported=JSON.stringify(backup(imported));
  assert.ok(!exported.includes('data:image'));
  assert.ok(!exported.includes('images'));
  assert.ok(exported.length<15000);
});

test('zoom, déplacement et recentrage restent finis sans modifier les coordonnées', () => {
  const map=vm.runInNewContext(extract('trip-map')+'\nTripMap;');
  const coords=[[-58.3816,-34.6037],[-71.31,-41.134]];
  const initial=map.fit(coords),zoomed=map.zoom(initial,.65);
  assert.ok(zoomed[2]<initial[2]);
  assert.ok(Math.abs((zoomed[0]+zoomed[2]/2)-(initial[0]+initial[2]/2))<.001);
  assert.deepEqual(plain(map.fit(coords)),plain(initial));
  let tiny=initial;for(let i=0;i<100;i++)tiny=map.zoom(tiny,.65);
  assert.ok(tiny[2]>=25);
  let wide=initial;for(let i=0;i<100;i++)wide=map.zoom(wide,1.54);
  assert.ok(wide[2]<=1400);
  assert.ok(map.pan(wide,1e6,-1e6).every(Number.isFinite));
  assert.ok(map.fit([]).every(Number.isFinite));
});

test('scripts intégrés valides, HTML sous 12 Mo, sans dépendance réseau', () => {
  new vm.Script(extract('trip-engine'));
  new vm.Script(extract('trip-map'));
  new vm.Script(extract('trip-app'));
  assert.ok(Buffer.byteLength(html)<12*1024*1024);
  assert.ok(!/__DATA__|__PHOTOS__|__MAP__|__APP__/.test(html));
});
