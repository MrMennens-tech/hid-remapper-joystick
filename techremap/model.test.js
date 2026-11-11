// Run with: node --test techremap/model.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from './model.js';

const cfg = () => ({ mappings: [], unmapped_passthrough_layers: [0, 1, 2, 3] });
const btn = u => ({ kind: 'button', targets: [{ u, d: 1000, a: 1000 }] });
const A = btn('0x00090005'), B = btn('0x00090006'), X = btn('0x0009000b'), Y = btn('0x0009000c');
const J1 = '0xfff40002', J2 = '0xfff40003', STAR = '0x00090001';
const layersOf = (c, source, target) => c.mappings.filter(m => m.source_usage === source && m.target_usage === target).map(m => m.layers);

test('a base assignment applies on every layer', () => {
    const c = cfg();
    M.assign(c, A, 0, J1);
    assert.deepEqual(layersOf(c, J1, A.targets[0].u), [[0, 1, 2, 3]]);
    assert.deepEqual(M.chips(c, A), [{ layer: 0, source: J1, base: true }]);
    assert.equal(M.layerState(c, A, 2).state, 'same');
});

test('the same input can be X on layer 1 and Y on layer 2', () => {
    const c = cfg();
    M.assign(c, X, 0, STAR);
    M.assign(c, Y, 1, STAR);
    assert.deepEqual(layersOf(c, STAR, X.targets[0].u), [[0, 2, 3]]);
    assert.deepEqual(layersOf(c, STAR, Y.targets[0].u), [[1]]);
    const s = M.layerState(c, X, 1);
    assert.equal(s.state, 'moved');
    assert.equal(s.to, Y.targets[0].u);
    assert.deepEqual(M.chips(c, Y), [{ layer: 1, source: STAR, base: false }]);
});

test('order of assigning does not matter', () => {
    const c = cfg();
    M.assign(c, Y, 1, STAR);
    M.assign(c, X, 0, STAR);
    assert.deepEqual(layersOf(c, STAR, X.targets[0].u), [[0, 2, 3]]);
});

test('clearing the layer assignment gives the layer back to the base', () => {
    const c = cfg();
    M.assign(c, X, 0, STAR);
    M.assign(c, Y, 1, STAR);
    M.clear(c, Y, 1);
    assert.deepEqual(layersOf(c, STAR, X.targets[0].u), [[0, 1, 2, 3]]);
    assert.equal(c.mappings.length, 1);
});

test('a layer can be switched off and follow layer 1 again', () => {
    const c = cfg();
    M.assign(c, A, 0, J1);
    M.clear(c, A, 2);
    assert.deepEqual(layersOf(c, J1, A.targets[0].u), [[0, 1, 3]]);
    assert.equal(M.layerState(c, A, 2).state, 'off');
    M.inherit(c, A, 2);
    assert.deepEqual(layersOf(c, J1, A.targets[0].u), [[0, 1, 2, 3]]);
});

test('another input on a layer replaces the base input there', () => {
    const c = cfg();
    M.assign(c, B, 0, J2);
    M.assign(c, B, 2, J1);
    assert.deepEqual(layersOf(c, J2, B.targets[0].u), [[0, 1, 3]]);
    assert.deepEqual(layersOf(c, J1, B.targets[0].u), [[2]]);
    assert.deepEqual(M.chips(c, B), [{ layer: 0, source: J2, base: true }, { layer: 2, source: J1, base: false }]);
    M.assign(c, B, 0, STAR);   // new base keeps layer 3 (index 2) for the explicit input
    assert.deepEqual(layersOf(c, STAR, B.targets[0].u), [[0, 1, 3]]);
});

test('reassigning the base replaces it', () => {
    const c = cfg();
    M.assign(c, A, 0, J1);
    M.assign(c, A, 0, J2);
    assert.equal(c.mappings.length, 1);
    assert.equal(c.mappings[0].source_usage, J2);
});

test('a stick is mapped axis for axis and named by its X axis', () => {
    const c = cfg();
    const LS = { kind: 'stick', axes: ['0x00010030', '0x00010031'] };
    const RS = { kind: 'stick', axes: ['0x00010032', '0x00010035'] };
    assert.equal(M.rejects(LS, J1), 'stick-needs-stick');
    M.assign(c, LS, 0, '0x00010031');           // moved the Y axis of the left stick
    M.assign(c, RS, 1, '0x00010030');
    assert.deepEqual(layersOf(c, '0x00010030', '0x00010030'), [[0, 2, 3]]);
    assert.deepEqual(layersOf(c, '0x00010031', '0x00010031'), [[0, 2, 3]]);
    assert.deepEqual(layersOf(c, '0x00010031', '0x00010035'), [[1]]);
    assert.deepEqual(M.chips(c, RS), [{ layer: 1, source: '0x00010030', base: false }]);
});

test('stick directions from buttons use the low and high end of the axis', () => {
    const c = cfg();
    const left = { kind: 'dir', targets: [{ u: '0x00010030', d: 0 }] };
    const right = { kind: 'dir', targets: [{ u: '0x00010030', d: 255000 }] };
    assert.equal(M.rejects(left, '0x00010030'), 'needs-button');
    M.assign(c, left, 0, J1);
    M.assign(c, right, 0, J2);
    assert.deepEqual(c.mappings.map(m => m.scaling), [0, 255000]);
    assert.deepEqual(M.chips(c, left).map(x => x.source), [J1]);
    assert.deepEqual(M.chips(c, right).map(x => x.source), [J2]);
});

test('a trigger gets both its button and its axis', () => {
    const c = cfg();
    const L2 = { kind: 'button', targets: [{ u: '0x00090007', d: 1000, a: 1000 }, { u: '0x00010033', d: 255000, a: 1000 }] };
    M.assign(c, L2, 0, J1);
    assert.deepEqual(c.mappings.map(m => [m.target_usage, m.scaling]), [['0x00090007', 1000], ['0x00010033', 255000]]);
    M.clear(c, L2, 0);
    assert.equal(c.mappings.length, 0);
});

test('cursor directions are told apart by sign and share a speed', () => {
    const c = cfg();
    const left = { kind: 'rel', sign: -1, targets: [{ u: '0x00010030' }] };
    const right = { kind: 'rel', sign: 1, targets: [{ u: '0x00010030' }] };
    M.assign(c, left, 0, J1);
    M.assign(c, right, 0, J2);
    assert.deepEqual(c.mappings.map(m => m.scaling), [-500, 500]);
    M.setSpeed(c, left, 800);
    assert.deepEqual(c.mappings.map(m => m.scaling), [-800, 500]);
    assert.equal(M.speed(c, left), 800);
});

test('layer switches: stepping through layers with one button', () => {
    const c = cfg();
    M.assign(c, A, 0, J1);
    M.addSwitch(c, 'goto', 0, 1, J2);
    M.addSwitch(c, 'goto', 1, 2, J2);
    assert.deepEqual(M.strandedLayers(c), [1, 2]);
    M.addSwitch(c, 'goto', 2, 0, J2);
    assert.deepEqual(M.strandedLayers(c), []);
    const sw = M.switches(c);
    assert.deepEqual(sw.map(s => [s.type, s.from, s.to]), [['goto', [0], 1], ['goto', [1], 2], ['goto', [2], 0]]);
    assert.equal(sw[0].mapping.target_usage, '0xfffc0001');
    // the base assignment of another input is untouched
    assert.deepEqual(layersOf(c, J1, A.targets[0].u), [[0, 1, 2, 3]]);
});

test('a hold layer is never a dead end, and its switch can be removed', () => {
    const c = cfg();
    M.assign(c, A, 0, J1);
    const m = M.addSwitch(c, 'hold', 0, 1, J2);
    assert.equal(m.target_usage, '0xfff10001');
    assert.deepEqual(M.strandedLayers(c), []);
    M.addSwitch(c, 'goto', 1, 0, J1);              // on layer 2, Jack 1 goes back instead of pressing A
    assert.deepEqual(layersOf(c, J1, A.targets[0].u), [[0, 2, 3]]);
    M.removeSwitch(c, c.mappings.find(x => x.target_usage === '0xfffc0000'));
    assert.deepEqual(layersOf(c, J1, A.targets[0].u), [[0, 1, 2, 3]]);
});

test('normalize spells out "all layers" and drops layers the firmware lacks', () => {
    const c = { mappings: [{ source_usage: J1, target_usage: A.targets[0].u, layers: [] }, { source_usage: J2, target_usage: A.targets[0].u, layers: [1, 6] }], unmapped_passthrough_layers: [0, 1, 2, 3, 4, 5, 6, 7] };
    M.normalize(c);
    assert.deepEqual(c.mappings.map(m => m.layers), [[0, 1, 2, 3], [1]]);
    assert.deepEqual(c.unmapped_passthrough_layers, [0, 1, 2, 3]);
});
