import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSettingsDto } from './update-settings.dto';

const errorsFor = async (body: object) => (await validate(plainToInstance(UpdateSettingsDto, body))).map((e) => e.property);

it('acepta una CLABE de 18 digitos y una tarjeta de 16', async () => {
  expect(await errorsFor({ bankClabe: '012345678901234567', bankCardNumber: '4111111111111111' })).toEqual([]);
});

it('acepta vacio para poder borrar la cuenta', async () => {
  expect(await errorsFor({ bankName: '', bankAccountHolder: '', bankClabe: '', bankCardNumber: '' })).toEqual([]);
});

it('rechaza una CLABE de 17 digitos y una tarjeta con espacios', async () => {
  expect(await errorsFor({ bankClabe: '01234567890123456', bankCardNumber: '4111 1111 1111 1111' })).toEqual(['bankClabe', 'bankCardNumber']);
});
