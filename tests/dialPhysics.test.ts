import { describe, expect, it } from 'vitest';
import {
	AM_MAX_KHZ,
	AM_MIN_KHZ,
	computeSignalLock,
	DialPhysicsController
} from '../src/lib/physics/dialPhysics';

describe('computeSignalLock', () => {
	it('locks onto 710 kHz with near-1.0 signal strength and zero heterodyne whistle', () => {
		const lock = computeSignalLock(710);
		expect(lock.nearestStation?.callsign).toBe('WCRN-AM');
		expect(lock.signalStrength).toBeCloseTo(1, 4);
		expect(lock.heterodyneGain).toBe(0);
	});

	it('produces heterodyne beat whistle slightly off-carrier', () => {
		const lock = computeSignalLock(717);
		expect(lock.nearestStation?.callsign).toBe('WCRN-AM');
		expect(lock.heterodyneHz).toBeCloseTo(840, 1);
		expect(lock.heterodyneGain).toBeGreaterThan(0.5);
	});

	it('locks onto 640 kHz WCC-MARCONI with morse_code program mode', () => {
		const lock = computeSignalLock(640);
		expect(lock.nearestStation?.callsign).toBe('WCC-MARCONI');
		expect(lock.nearestStation?.programMode).toBe('morse_code');
		expect(lock.signalStrength).toBeCloseTo(1, 4);
	});

	it('locks onto 870 kHz WGN-MIDWEST with broadcast program mode', () => {
		const lock = computeSignalLock(870);
		expect(lock.nearestStation?.callsign).toBe('WGN-MIDWEST');
		expect(lock.nearestStation?.programMode).toBe('broadcast');
		expect(lock.signalStrength).toBeCloseTo(1, 4);
	});

	it('returns zero signal in inter-station static', () => {
		const lock = computeSignalLock(580);
		expect(lock.nearestStation).toBeNull();
		expect(lock.signalStrength).toBe(0);
		expect(lock.heterodyneGain).toBe(0);
	});
});

describe('DialPhysicsController', () => {
	it('clamps frequency to AM band limits', () => {
		const dial = new DialPhysicsController(710);
		expect(dial.setFrequency(200)).toBe(AM_MIN_KHZ);
		expect(dial.setFrequency(2200)).toBe(AM_MAX_KHZ);
	});

	it('coasts with inertia and settles via magnetic detent near a station', () => {
		const dial = new DialPhysicsController(706);
		dial.applyImpulse(10);
		for (let i = 0; i < 60; i++) {
			dial.step(0.016);
		}
		expect(Math.abs(dial.frequencyKHz - 710)).toBeLessThan(1.5);
	});
});
