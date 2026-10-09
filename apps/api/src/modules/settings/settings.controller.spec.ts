import { SettingsController } from './settings.controller';

const settings = { id: 1, fragranceSurcharge: 1, fragranceDropsPer100g: 20, fragranceRealCost: false, fragranceLoadPct: 0.08 };

it('GET y PATCH no exponen fragranceLoadPct (deprecado): el admin reenvia lo que recibe y el DTO lo rechaza', async () => {
  const service = { get: jest.fn().mockResolvedValue(settings), update: jest.fn().mockResolvedValue(settings) };
  const controller = new SettingsController(service as never);

  const got = await controller.get();
  const updated = await controller.update({} as never);

  expect(got).not.toHaveProperty('fragranceLoadPct');
  expect(updated).not.toHaveProperty('fragranceLoadPct');
  expect(got).toMatchObject({ fragranceDropsPer100g: 20, fragranceRealCost: false });
});
