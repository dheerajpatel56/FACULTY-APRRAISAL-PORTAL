import { describe, it, expect } from 'vitest';
import { ROW_CONTENT_FIELDS, ROW_MODELS, rowHasContent, dropBlankRows } from './blankRows';

describe('blankRows', () => {
  it('maps every content-field key to a Prisma model', () => {
    expect(Object.keys(ROW_MODELS).sort()).toEqual(Object.keys(ROW_CONTENT_FIELDS).sort());
  });

  it('treats a row with no alphanumeric identifier as blank', () => {
    expect(rowHasContent({ title: '' }, ['title'])).toBe(false);
    expect(rowHasContent({ title: '   ' }, ['title'])).toBe(false);
    expect(rowHasContent({ title: '.' }, ['title'])).toBe(false);
    expect(rowHasContent({ title: null }, ['title'])).toBe(false);
    expect(rowHasContent({}, ['title'])).toBe(false);
  });

  it('keeps a row when any identifier field has real content', () => {
    expect(rowHasContent({ title: 'A Study', journalName: '' }, ['title', 'journalName'])).toBe(true);
    expect(rowHasContent({ title: '', journalName: 'IEEE' }, ['title', 'journalName'])).toBe(true);
    expect(rowHasContent({ title: '7' }, ['title'])).toBe(true);
  });

  it('never treats a dropdown default or number as content', () => {
    // nature/status are enums; a blank row carries them pre-filled.
    expect(rowHasContent({ title: '', nature: 'Video', hours: 40 }, ['title'])).toBe(false);
  });

  it('strips only the blank rows from a payload, in place', () => {
    const categories: any = {
      cat2Journals: [
        { title: 'Real paper', journalName: 'IEEE TSE' },
        { title: '', journalName: '' },
      ],
      cat5Memberships: [{ association: '' }],
      cat1Courses: [{ courseName: 'OS' }],
    };
    dropBlankRows(categories);
    expect(categories.cat2Journals).toHaveLength(1);
    expect(categories.cat2Journals[0].title).toBe('Real paper');
    expect(categories.cat5Memberships).toHaveLength(0);
    expect(categories.cat1Courses).toHaveLength(1);
  });

  it('ignores absent sections and a missing payload', () => {
    const categories: any = { cat2Journals: [{ title: 'X' }] };
    dropBlankRows(categories);
    expect(categories.cat5Awards).toBeUndefined();
    expect(() => dropBlankRows(undefined)).not.toThrow();
    expect(() => dropBlankRows(null)).not.toThrow();
  });
});
