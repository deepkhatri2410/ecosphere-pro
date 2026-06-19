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

  test('calculateBaseCarbonFootprint returns a positive number for default inputs', () => {
    const footprint = window.calculateBaseCarbonFootprint();
    expect(typeof footprint).toBe('number');
    expect(footprint).toBeGreaterThan(0);
  });

  test('calculateCategoryBreakdown returns all expected categories', () => {
    const breakdown = window.calculateCategoryBreakdown();
    expect(breakdown).toEqual(expect.objectContaining({ transport: expect.any(Number), energy: expect.any(Number), food: expect.any(Number), waste: expect.any(Number) }));
    expect(breakdown.transport + breakdown.energy + breakdown.food + breakdown.waste).toBeCloseTo(window.calculateBaseCarbonFootprint(), 5);
  });

  test('updateBudgetBar updates width and status text based on net emissions', () => {
    const budgetBar = document.getElementById('val-budget-bar');
    const budgetStatus = document.getElementById('val-budget-status');
    expect(budgetBar).not.toBeNull();
    expect(budgetStatus).not.toBeNull();

    window.updateBudgetBar(2.5);
    expect(budgetBar.style.width).toBe('31.25%');
    expect(budgetStatus.textContent).toContain('budget remaining');

    window.updateBudgetBar(4.2);
    expect(budgetStatus.textContent).toContain('over annual target');
  });

  test('updateNetZeroProgress updates progress text and fill width', () => {
    const fill = document.getElementById('netzero-fill');
    const percent = document.getElementById('netzero-percent');
    expect(fill).not.toBeNull();
    expect(percent).not.toBeNull();

    window.updateNetZeroProgress(10, 7);
    expect(percent.textContent).toBe('30%');
    expect(fill.style.width).toBe('30%');
  });

  test('announceStatus writes sanitized text into the live region', () => {
    const liveRegion = document.getElementById('aria-live-region');
    window.announceStatus('Testing <alert>');
    expect(liveRegion.textContent).toBe('Testing alert');
  });

  test('leaderboard and library tables include column scope attributes', () => {
    const leaderboardHeaders = Array.from(document.querySelectorAll('.leaderboard-table th'));
    const libraryHeaders = Array.from(document.querySelectorAll('.library-table th'));
    expect(leaderboardHeaders.every(th => th.hasAttribute('scope'))).toBe(true);
    expect(libraryHeaders.every(th => th.hasAttribute('scope'))).toBe(true);
  });
});
