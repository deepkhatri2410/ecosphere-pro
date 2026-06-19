/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
document.documentElement.innerHTML = html;

require('./app');

describe('EcoSphere Pro app', () => {
  test('sanitizes text content before inserting into the DOM', () => {
    const dirty = '<img src=x onerror=alert(1)>safe';
    const cleaned = window.sanitizeText(dirty);
    expect(cleaned).toBe('img src=x onerror=alert(1)safe');
  });

  test('StateManager queues updates and applies them after dispatch', (done) => {
    const manager = new window.StateManager({ value: 0 });
    manager.subscribe((newState) => {
      expect(newState.value).toBe(1);
      done();
    });
    manager.dispatch(prev => ({ ...prev, value: 1 }));
  });
});
