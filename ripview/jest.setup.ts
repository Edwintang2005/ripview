import '@testing-library/jest-dom';

// The app renders every time in Australia/Sydney regardless of where it runs,
// so pin the test timezone too. Without this, snapshot-style assertions on
// formatted times pass locally and fail in CI.
process.env.TZ = 'Australia/Sydney';
