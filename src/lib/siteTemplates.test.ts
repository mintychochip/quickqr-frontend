import { SITE_TEMPLATES, templateById } from './siteTemplates';
import { SITE_FILE_CAP } from './siteFiles';

describe('site templates', () => {
  test('every template has a unique id and a usable name', () => {
    const ids = SITE_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of SITE_TEMPLATES) {
      expect(template.name.length > 0).toBe(true);
      expect(templateById(template.id)).toBe(template);
    }
  });

  test('blank starts empty and every other template has a root index', () => {
    const blank = templateById('blank');
    expect(blank?.files).toEqual([]);
    for (const template of SITE_TEMPLATES.filter((entry) => entry.id !== 'blank')) {
      expect(template.files.some((file) => file.path === 'index.html')).toBe(true);
    }
  });

  test('templates are self-contained: no scripts and no external requests', () => {
    for (const template of SITE_TEMPLATES) {
      for (const file of template.files) {
        expect(file.body.includes('<script')).toBe(false);
        expect(/https?:\/\//i.test(file.body)).toBe(false);
        expect(/@import/i.test(file.body)).toBe(false);
        expect(file.body.length < SITE_FILE_CAP).toBe(true);
      }
    }
  });

  test('an unknown template is undefined', () => {
    expect(templateById('nope')).toBe(undefined);
  });
});
