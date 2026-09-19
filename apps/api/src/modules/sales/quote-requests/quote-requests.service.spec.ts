// La landing manda supplyId + valor; solo cuentan los insumos marcados "Indicar
// en cotizacion" que estan en el BOM del producto, y el label sale de la BD.
import { cleanExtraFields } from './quote-requests.service';

const bom = [
  { supply: { id: 5, quoteFieldLabel: 'Color del liston' } },
  { supply: { id: 6, quoteFieldLabel: null } },
];

test('descarta insumos ajenos al BOM, sin label, vacios y duplicados; el label viene de la BD', () => {
  const result = cleanExtraFields(
    [
      { supplyId: 5, value: '  rosa palo ' },
      { supplyId: 5, value: 'azul' },
      { supplyId: 99, value: 'ajeno' },
      { supplyId: 6, value: 'sin etiqueta' },
    ],
    bom,
  );
  expect(result).toEqual([{ supplyId: 5, label: 'Color del liston', value: 'rosa palo' }]);
});

test('valor en blanco o sin extraFields no genera nada', () => {
  expect(cleanExtraFields([{ supplyId: 5, value: '   ' }], bom)).toEqual([]);
  expect(cleanExtraFields(undefined, bom)).toEqual([]);
});
