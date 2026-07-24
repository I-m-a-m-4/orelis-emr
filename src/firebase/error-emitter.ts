// src/firebase/error-emitter.ts
import { EventEmitter } from 'events';

// This is a simple event emitter to broadcast errors across the app.
// We use this to decouple error-throwing logic from error-displaying logic.
export const errorEmitter = new EventEmitter();
