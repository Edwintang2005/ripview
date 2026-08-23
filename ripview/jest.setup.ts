import '@testing-library/jest-dom';

// The app renders every time in Australia/Sydney regardless of where it runs,
// so pin the test timezone too. Without this, snapshot-style assertions on
// formatted times pass locally and fail in CI.
process.env.TZ = 'Australia/Sydney';

// jsdom implements no layout, so it has no scrollIntoView. StopSearch calls it
// to keep the highlighted option visible during keyboard navigation. Stubbing
// it here rather than guarding the call keeps the component written against
// what real browsers actually provide.
Element.prototype.scrollIntoView = jest.fn();
