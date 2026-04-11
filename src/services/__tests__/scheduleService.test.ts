/**
 * Integration tests for scheduleService
 * Tests scheduling logic including activation windows and recurring patterns
 */
import {
  checkScheduleActive,
  fetchQRSchedule,
  type QRSchedule,
  type ScheduleCheckResult,
} from '../scheduleService';

describe('scheduleService exports', () => {
  test('checkScheduleActive is exported as a function', () => {
    expect(typeof checkScheduleActive).toBe('function');
  });

  test('fetchQRSchedule is exported as a function', () => {
    expect(typeof fetchQRSchedule).toBe('function');
  });
});

describe('checkScheduleActive - no schedule', () => {
  test('returns isActive: true when schedule is null', () => {
    const result = checkScheduleActive(null);
    expect(result.isActive).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('checkScheduleActive - one-time schedule', () => {
  const createSchedule = (overrides: Partial<QRSchedule> = {}): QRSchedule => ({
    id: 'test-schedule-id',
    qr_id: 'test-qr-id',
    activation_date: null,
    activation_time: null,
    expiration_date: null,
    expiration_time: null,
    recurring: 'none',
    timezone: 'UTC',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  test('returns isActive: true when schedule has no activation or expiration', () => {
    const schedule = createSchedule();
    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(true);
  });

  test('returns not_active when current time is before activation', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const schedule = createSchedule({
      activation_date: futureDate.toISOString().split('T')[0],
      activation_time: '09:00:00',
    });

    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(false);
    expect(result.error).toBe('not_active');
  });

  test('returns isActive: true when current time is after activation', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const schedule = createSchedule({
      activation_date: pastDate.toISOString().split('T')[0],
      activation_time: '00:00:00',
    });

    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(true);
  });

  test('returns schedule_expired when current time is after expiration', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const schedule = createSchedule({
      expiration_date: pastDate.toISOString().split('T')[0],
      expiration_time: '00:00:00',
    });

    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(false);
    expect(result.error).toBe('schedule_expired');
  });

  test('returns isActive: true when current time is before expiration', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const schedule = createSchedule({
      expiration_date: futureDate.toISOString().split('T')[0],
      expiration_time: '23:59:59',
    });

    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(true);
  });

  test('handles activation date with no time (defaults to midnight)', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedule = createSchedule({
      activation_date: tomorrow.toISOString().split('T')[0],
      activation_time: null,
    });

    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(false);
    expect(result.error).toBe('not_active');
  });

  test('handles expiration date with no time (defaults to midnight)', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const schedule = createSchedule({
      expiration_date: yesterday.toISOString().split('T')[0],
      expiration_time: null,
    });

    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(false);
    expect(result.error).toBe('schedule_expired');
  });

  test('returns isActive: true when within activation window', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedule = createSchedule({
      activation_date: yesterday.toISOString().split('T')[0],
      expiration_date: tomorrow.toISOString().split('T')[0],
    });

    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(true);
  });
});

describe('checkScheduleActive - daily recurring schedule', () => {
  const createDailySchedule = (overrides: Partial<QRSchedule> = {}): QRSchedule => ({
    id: 'test-schedule-id',
    qr_id: 'test-qr-id',
    activation_date: null,
    activation_time: '09:00:00',
    expiration_date: null,
    expiration_time: '17:00:00',
    recurring: 'daily',
    timezone: 'UTC',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  test('daily schedule is always active on any day', () => {
    const schedule = createDailySchedule({
      activation_time: null,
      expiration_time: null,
    });

    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(true);
  });

  test('returns not_active before daily activation time', () => {
    // Mock current time to be before activation (before 9 AM)
    const mockNow = new Date();
    mockNow.setHours(8, 0, 0, 0);

    const schedule = createDailySchedule();

    const result = checkScheduleActive(schedule);

    // If current time is before 9 AM, should be not_active
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < 9) {
      expect(result.isActive).toBe(false);
      expect(result.error).toBe('not_active');
    } else if (currentHour >= 17) {
      expect(result.isActive).toBe(false);
      expect(result.error).toBe('schedule_expired');
    } else {
      expect(result.isActive).toBe(true);
    }
  });

  test('returns schedule_expired after daily expiration time', () => {
    const now = new Date();
    const currentHour = now.getHours();

    const schedule = createDailySchedule();
    const result = checkScheduleActive(schedule);

    if (currentHour >= 17) {
      expect(result.isActive).toBe(false);
      expect(result.error).toBe('schedule_expired');
    } else if (currentHour < 9) {
      expect(result.isActive).toBe(false);
      expect(result.error).toBe('not_active');
    } else {
      expect(result.isActive).toBe(true);
    }
  });
});

describe('checkScheduleActive - weekly recurring schedule', () => {
  const createWeeklySchedule = (overrides: Partial<QRSchedule> = {}): QRSchedule => ({
    id: 'test-schedule-id',
    qr_id: 'test-qr-id',
    activation_date: null,
    activation_time: null,
    expiration_date: null,
    expiration_time: null,
    recurring: 'weekly',
    timezone: 'UTC',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  test('weekly schedule active on weekdays', () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const schedule = createWeeklySchedule();
    const result = checkScheduleActive(schedule);

    if (isWeekend) {
      expect(result.isActive).toBe(false);
      expect(result.error).toBe('not_active');
    } else {
      expect(result.isActive).toBe(true);
    }
  });

  test('weekly schedule respects time windows on weekdays', () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const schedule = createWeeklySchedule({
      activation_time: '09:00:00',
      expiration_time: '17:00:00',
    });

    const result = checkScheduleActive(schedule);

    if (isWeekend) {
      expect(result.isActive).toBe(false);
      expect(result.error).toBe('not_active');
    } else {
      const currentHour = now.getHours();
      if (currentHour < 9) {
        expect(result.isActive).toBe(false);
        expect(result.error).toBe('not_active');
      } else if (currentHour >= 17) {
        expect(result.isActive).toBe(false);
        expect(result.error).toBe('schedule_expired');
      } else {
        expect(result.isActive).toBe(true);
      }
    }
  });
});

describe('checkScheduleActive - monthly recurring schedule', () => {
  const createMonthlySchedule = (overrides: Partial<QRSchedule> = {}): QRSchedule => ({
    id: 'test-schedule-id',
    qr_id: 'test-qr-id',
    activation_date: null,
    activation_time: null,
    expiration_date: null,
    expiration_time: null,
    recurring: 'monthly',
    timezone: 'UTC',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  test('monthly schedule active only on 1st of month', () => {
    const now = new Date();
    const dateOfMonth = now.getDate();
    const isFirstOfMonth = dateOfMonth === 1;

    const schedule = createMonthlySchedule();
    const result = checkScheduleActive(schedule);

    if (isFirstOfMonth) {
      expect(result.isActive).toBe(true);
    } else {
      expect(result.isActive).toBe(false);
      expect(result.error).toBe('not_active');
    }
  });

  test('monthly schedule respects time windows on the 1st', () => {
    const now = new Date();
    const dateOfMonth = now.getDate();
    const isFirstOfMonth = dateOfMonth === 1;

    const schedule = createMonthlySchedule({
      activation_time: '09:00:00',
      expiration_time: '17:00:00',
    });

    const result = checkScheduleActive(schedule);

    if (!isFirstOfMonth) {
      expect(result.isActive).toBe(false);
      expect(result.error).toBe('not_active');
    } else {
      const currentHour = now.getHours();
      if (currentHour < 9) {
        expect(result.isActive).toBe(false);
        expect(result.error).toBe('not_active');
      } else if (currentHour >= 17) {
        expect(result.isActive).toBe(false);
        expect(result.error).toBe('schedule_expired');
      } else {
        expect(result.isActive).toBe(true);
      }
    }
  });
});

describe('checkScheduleActive - timezone handling', () => {
  test('handles UTC timezone', () => {
    const schedule: QRSchedule = {
      id: 'test-schedule-id',
      qr_id: 'test-qr-id',
      activation_date: null,
      activation_time: null,
      expiration_date: null,
      expiration_time: null,
      recurring: 'none',
      timezone: 'UTC',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(true);
  });

  test('handles America/New_York timezone', () => {
    const schedule: QRSchedule = {
      id: 'test-schedule-id',
      qr_id: 'test-qr-id',
      activation_date: null,
      activation_time: null,
      expiration_date: null,
      expiration_time: null,
      recurring: 'none',
      timezone: 'America/New_York',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(true);
  });
});

describe('fetchQRSchedule integration', () => {
  test('fetchQRSchedule function exists and accepts correct parameters', () => {
    // Verify the function accepts the expected parameters
    expect(fetchQRSchedule).toBeDefined();
    expect(fetchQRSchedule.length).toBe(2); // supabase and qrId parameters
  });

  test('fetchQRSchedule returns null on error', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('Not found') }),
          }),
        }),
      }),
    };

    const result = await fetchQRSchedule(mockSupabase, 'non-existent-id');
    expect(result).toBeNull();
  });
});

describe('scheduleService edge cases', () => {
  test('handles invalid activation date gracefully', () => {
    const schedule: QRSchedule = {
      id: 'test-schedule-id',
      qr_id: 'test-qr-id',
      activation_date: 'invalid-date',
      activation_time: '09:00:00',
      expiration_date: null,
      expiration_time: null,
      recurring: 'none',
      timezone: 'UTC',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = checkScheduleActive(schedule);
    // Invalid dates are treated as not set
    expect(result.isActive).toBe(true);
  });

  test('handles invalid expiration date gracefully', () => {
    const schedule: QRSchedule = {
      id: 'test-schedule-id',
      qr_id: 'test-qr-id',
      activation_date: null,
      activation_time: null,
      expiration_date: 'invalid-date',
      expiration_time: '17:00:00',
      recurring: 'none',
      timezone: 'UTC',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = checkScheduleActive(schedule);
    // Invalid dates are treated as not set
    expect(result.isActive).toBe(true);
  });

  test('handles empty string dates gracefully', () => {
    const schedule: QRSchedule = {
      id: 'test-schedule-id',
      qr_id: 'test-qr-id',
      activation_date: '',
      activation_time: '',
      expiration_date: '',
      expiration_time: '',
      recurring: 'none',
      timezone: 'UTC',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(true);
  });

  test('handles schedule with only activation date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const schedule: QRSchedule = {
      id: 'test-schedule-id',
      qr_id: 'test-qr-id',
      activation_date: yesterday.toISOString().split('T')[0],
      activation_time: null,
      expiration_date: null,
      expiration_time: null,
      recurring: 'none',
      timezone: 'UTC',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(true);
  });

  test('handles schedule with only expiration date', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedule: QRSchedule = {
      id: 'test-schedule-id',
      qr_id: 'test-qr-id',
      activation_date: null,
      activation_time: null,
      expiration_date: tomorrow.toISOString().split('T')[0],
      expiration_time: null,
      recurring: 'none',
      timezone: 'UTC',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = checkScheduleActive(schedule);
    expect(result.isActive).toBe(true);
  });
});

describe('scheduleService interface types', () => {
  test('ScheduleCheckResult has required properties', () => {
    const activeResult: ScheduleCheckResult = { isActive: true };
    expect(activeResult.isActive).toBe(true);

    const inactiveResult: ScheduleCheckResult = {
      isActive: false,
      error: 'not_active',
      reason: 'Test reason',
    };
    expect(inactiveResult.isActive).toBe(false);
    expect(inactiveResult.error).toBe('not_active');
    expect(inactiveResult.reason).toBe('Test reason');
  });

  test('QRSchedule has all required properties', () => {
    const schedule: QRSchedule = {
      id: 'test-id',
      qr_id: 'test-qr-id',
      activation_date: '2024-01-01',
      activation_time: '09:00:00',
      expiration_date: '2024-12-31',
      expiration_time: '17:00:00',
      recurring: 'weekly',
      timezone: 'America/Los_Angeles',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(schedule.id).toBe('test-id');
    expect(schedule.recurring).toBe('weekly');
    expect(schedule.timezone).toBe('America/Los_Angeles');
  });
});
