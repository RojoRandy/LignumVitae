import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';

it('acepta un cliente sin telefono', async () => {
  const dto = plainToInstance(CreateCustomerDto, { fullName: 'Ana' });

  expect(await validate(dto)).toEqual([]);
});

it('acepta un cliente con telefono null', async () => {
  const dto = plainToInstance(CreateCustomerDto, { fullName: 'Ana', phone: null });

  expect(await validate(dto)).toEqual([]);
});

it('rechaza un telefono que no tiene 10 digitos', async () => {
  const dto = plainToInstance(CreateCustomerDto, { fullName: 'Ana', phone: '123' });

  const errors = await validate(dto);

  expect(errors.find((error) => error.property === 'phone')?.constraints).toHaveProperty(
    'matches',
    'El telefono debe tener exactamente 10 digitos',
  );
});

it('acepta un telefono de 10 digitos', async () => {
  const dto = plainToInstance(CreateCustomerDto, { fullName: 'Ana', phone: '3312345678' });

  expect(await validate(dto)).toEqual([]);
});
