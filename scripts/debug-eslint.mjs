import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

console.log('nextVitals type:', typeof nextVitals);
console.log('nextVitals isArray:', Array.isArray(nextVitals));
console.log('nextVitals keys:', Object.keys(nextVitals || {}));
console.log('nextTs type:', typeof nextTs);
console.log('nextTs isArray:', Array.isArray(nextTs));
