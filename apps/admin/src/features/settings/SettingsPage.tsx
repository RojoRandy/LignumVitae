import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/use-settings';
import { httpPatch } from '@/lib/http';
import type { SettingsDto } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useSupplyOptions } from '@/hooks/use-supply-options';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader, PageState } from '@/components/ui/page';

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<SettingsDto>>({});
  // includeWax: aqui se elige JUSTAMENTE la cera, que es lo unico que el
  // hook excluye por defecto (nunca va en el BOM de un producto).
  const { options: supplyOptions } = useSupplyOptions({ includeWax: true });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => httpPatch('/settings', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Configuracion guardada');
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const set = <K extends keyof SettingsDto>(key: K, value: SettingsDto[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  // Ayudantes para los campos numericos controlados con NumberInput: unos se
  // guardan como number en el DTO (dias, minutos, piezas) y otros como
  // string porque el backend los serializa como Decimal (dinero y
  // porcentajes). Ambos aceptan null mientras el usuario borra el campo;
  // el atributo `required` de cada NumberInput bloquea el submit hasta que
  // vuelva a tener un valor valido, asi que nunca se guarda null.
  const setNumber = <K extends keyof SettingsDto>(key: K) => (value: number | null) =>
    setForm((prev) => ({ ...prev, [key]: value as SettingsDto[K] }));
  const setDecimal = <K extends keyof SettingsDto>(key: K) => (value: number | null) =>
    setForm((prev) => ({ ...prev, [key]: (value === null ? '' : String(value)) as SettingsDto[K] }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // El DTO usa whitelist estricta: id/createdAt/updatedAt no son
    // editables (id siempre es 1) y el ValidationPipe rechaza toda la
    // peticion si vienen, aunque sea con el mismo valor que ya tenian.
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...editable } = form;
    saveMutation.mutate(editable);
  };

  if (isLoading || !data) {
    return (
      <PageState isLoading />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PageHeader
        title="Configuracion"
        description="Todo lo que en el Excel era una celda capturada a mano vive aqui."
        actions={
          <Button type="submit" loading={saveMutation.isPending}>
            Guardar cambios
          </Button>
        }
      />

      <Tabs defaultValue="identidad">
        <TabsList>
          <TabsTrigger value="identidad">Identidad</TabsTrigger>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="costeo">Costeo</TabsTrigger>
          <TabsTrigger value="precios">Precios</TabsTrigger>
          <TabsTrigger value="textos">Textos</TabsTrigger>
        </TabsList>

        <TabsContent value="identidad">
          <Card className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <Field label="Nombre de la marca" htmlFor="brandName">
              <Input id="brandName" value={form.brandName ?? ''} onChange={(e) => set('brandName', e.target.value)} />
            </Field>
            <Field label="Razon social" htmlFor="legalName">
              <Input id="legalName" value={form.legalName ?? ''} onChange={(e) => set('legalName', e.target.value)} />
            </Field>
            <Field label="Telefono" htmlFor="phone">
              <Input id="phone" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="WhatsApp" htmlFor="whatsapp">
              <Input id="whatsapp" value={form.whatsapp ?? ''} onChange={(e) => set('whatsapp', e.target.value)} />
            </Field>
            <Field label="Correo" htmlFor="email">
              <Input id="email" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Horario" htmlFor="businessHours">
              <Input id="businessHours" value={form.businessHours ?? ''} onChange={(e) => set('businessHours', e.target.value)} />
            </Field>
            <Field label="Ciudad" htmlFor="city">
              <Input id="city" value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="Estado" htmlFor="state">
              <Input id="state" value={form.state ?? ''} onChange={(e) => set('state', e.target.value)} />
            </Field>
            <Field label="Instagram" htmlFor="instagramUrl">
              <Input id="instagramUrl" value={form.instagramUrl ?? ''} onChange={(e) => set('instagramUrl', e.target.value)} />
            </Field>
            <Field label="Facebook" htmlFor="facebookUrl">
              <Input id="facebookUrl" value={form.facebookUrl ?? ''} onChange={(e) => set('facebookUrl', e.target.value)} />
            </Field>
          </Card>
        </TabsContent>

        <TabsContent value="comercial">
          <Card className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <Field label="Dias minimos de anticipacion" htmlFor="minLeadTimeDays" hint='"Se deben ordenar con un minimo de 7 dias"'>
              <NumberInput id="minLeadTimeDays" min={0} step={1} required value={form.minLeadTimeDays ?? null} onChange={setNumber('minLeadTimeDays')} />
            </Field>
            <Field label="Anticipo (%)" htmlFor="depositPct" hint='"Confirma tu pedido con el 40% de anticipo"'>
              <NumberInput id="depositPct" min={0} max={100} step={1} unit="%" required value={form.depositPct !== undefined ? Number(form.depositPct) : null} onChange={setDecimal('depositPct')} />
            </Field>
            <Field label="Vigencia de la cotizacion (dias)" htmlFor="quotationValidityDays">
              <NumberInput id="quotationValidityDays" min={1} step={1} required value={form.quotationValidityDays ?? null} onChange={setNumber('quotationValidityDays')} />
            </Field>
            <Field label="Sueldo diario" htmlFor="dailyWage" hint="Base del costo de mano de obra">
              <NumberInput id="dailyWage" step={0.01} min={0} unit="$" unitPosition="prefix" required value={form.dailyWage !== undefined ? Number(form.dailyWage) : null} onChange={setDecimal('dailyWage')} />
            </Field>
            <Field label="Horas por dia" htmlFor="workHoursPerDay">
              <NumberInput id="workHoursPerDay" min={1} max={24} step={1} required value={form.workHoursPerDay ?? null} onChange={setNumber('workHoursPerDay')} />
            </Field>
          </Card>
        </TabsContent>

        <TabsContent value="costeo">
          <Card className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <Field
              label="Insumo de cera por defecto"
              htmlFor="waxSupplyId"
              tooltip="De que insumo sale el precio por gramo de cera de toda vela que no tenga la suya propia. Sin esto, el costo de cera de TODOS los productos se calcula con $0 y el precio sale mas bajo de lo que cuesta producir."
            >
              <Select
                id="waxSupplyId"
                options={supplyOptions}
                value={form.waxSupplyId ? String(form.waxSupplyId) : ''}
                onChange={(v) => set('waxSupplyId', (v ? Number(v) : null) as never)}
                placeholder="Sin definir"
                clearable
                searchable
              />
            </Field>
            <Field
              label="Insumo de aroma por defecto"
              htmlFor="fragranceSupplyId"
              tooltip="De que insumo sale el precio del aroma. Es distinto del 'Cargo por aroma', que es un cargo fijo de mano de obra."
            >
              <Select
                id="fragranceSupplyId"
                options={supplyOptions}
                value={form.fragranceSupplyId ? String(form.fragranceSupplyId) : ''}
                onChange={(v) => set('fragranceSupplyId', (v ? Number(v) : null) as never)}
                placeholder="Sin definir"
                clearable
                searchable
              />
            </Field>
            <Field
              label="Capacidad de la olla (g)"
              htmlFor="meltBatchGrams"
              hint='Reemplaza el "/30" del Excel'
              tooltip="Cuantos gramos de cera caben en la olla de una sola vez, por defecto para toda vela que no tenga su propia capacidad definida. Con esto se calculan las piezas que salen por lote y se reparte el tiempo de derretido entre ellas, en vez del '/30' fijo que usaba el Excel para todas las velas por igual."
            >
              <NumberInput id="meltBatchGrams" min={1} step={1} unit="g" required value={form.meltBatchGrams ?? null} onChange={setNumber('meltBatchGrams')} />
            </Field>
            <Field
              label="Merma de vaciado por defecto (%)"
              htmlFor="defaultWastePct"
              tooltip="Porcentaje que se suma a los gramos de cada vela para cubrir la cera que se pierde al vaciar el molde, por defecto para toda vela que no tenga su propio porcentaje de merma."
            >
              <NumberInput
                id="defaultWastePct"
                min={0}
                max={100}
                step={0.1}
                unit="%"
                required
                value={form.defaultWastePct ? Number(form.defaultWastePct) * 100 : null}
                onChange={(v) => set('defaultWastePct', (v === null ? '' : String(v / 100)) as never)}
              />
            </Field>
            <Field
              label="Cargo por aroma ($)"
              htmlFor="fragranceSurcharge"
              hint='El "+1" del Excel, ahora explicito'
              tooltip="Cargo fijo en dinero que se suma al costo de cada vela por llevar aroma, en vez de quedar escondido dentro del precio como en el Excel."
            >
              <NumberInput id="fragranceSurcharge" step={0.01} min={0} unit="$" unitPosition="prefix" required value={form.fragranceSurcharge !== undefined ? Number(form.fragranceSurcharge) : null} onChange={setDecimal('fragranceSurcharge')} />
            </Field>
            <Field
              label="Tasa de respaldo ($/min)"
              htmlFor="overheadRatePerMinute"
              hint='Sustituye la constante $2.50 del Excel'
              tooltip="La tasa de $ por minuto que usa el costeo de todo el catalogo mientras no haya ningun mes cerrado (o justo despues de reabrir uno). Hoy por hoy es LA tasa que esta usando todo el catalogo: el cierre mensual todavia no puede derivar una tasa real porque necesita minutos de pedidos entregados, y esa parte del sistema llega en una fase posterior."
            >
              <NumberInput id="overheadRatePerMinute" step={0.000001} min={0} unit="$" unitPosition="prefix" required value={form.overheadRatePerMinute !== undefined ? Number(form.overheadRatePerMinute) : null} onChange={setDecimal('overheadRatePerMinute')} />
            </Field>
            <Field
              label="Ventana de compras para costo sugerido (dias)"
              htmlFor="supplyCostWindowDays"
              tooltip="Cuantos dias hacia atras se promedian las compras de un insumo para calcular su 'costo sugerido' (la etiqueta amarilla 'Aplicar' en Insumos). Una ventana corta reacciona mas rapido a subidas de precio; una larga suaviza compras puntuales fuera de lo normal."
            >
              <NumberInput id="supplyCostWindowDays" min={1} step={1} unit="dias" required value={form.supplyCostWindowDays ?? null} onChange={setNumber('supplyCostWindowDays')} />
            </Field>
            <Field
              label="Vida util de activos por defecto (meses)"
              htmlFor="defaultAssetUsefulLifeMonths"
              tooltip="En cuantos meses se reparte el costo de un molde o equipo nuevo hacia los gastos indirectos, cuando no se le da una vida util propia al registrarlo en Moldes y equipo."
            >
              <NumberInput id="defaultAssetUsefulLifeMonths" min={1} step={1} unit="meses" required value={form.defaultAssetUsefulLifeMonths ?? null} onChange={setNumber('defaultAssetUsefulLifeMonths')} />
            </Field>
          </Card>
        </TabsContent>

        <TabsContent value="precios">
          <Card className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            <Field
              label="Markup de menudeo (%)"
              htmlFor="retailMarkupPct"
              tooltip="Porcentaje que se suma sobre el costo de fabricar la pieza para llegar al precio SUGERIDO de menudeo (pedidos por debajo del umbral de mayoreo)."
            >
              <NumberInput id="retailMarkupPct" step={0.1} min={0} unit="%" required value={form.retailMarkupPct !== undefined ? Number(form.retailMarkupPct) : null} onChange={setDecimal('retailMarkupPct')} />
            </Field>
            <Field
              label="Markup de mayoreo (%)"
              htmlFor="wholesaleMarkupPct"
              tooltip="Porcentaje que se suma sobre el costo de fabricar la pieza para llegar al precio SUGERIDO de mayoreo, una vez que el pedido llega al umbral de piezas de abajo."
            >
              <NumberInput id="wholesaleMarkupPct" step={0.1} min={0} unit="%" required value={form.wholesaleMarkupPct !== undefined ? Number(form.wholesaleMarkupPct) : null} onChange={setDecimal('wholesaleMarkupPct')} />
            </Field>
            <Field
              label="Umbral de mayoreo (piezas)"
              htmlFor="wholesaleThresholdQty"
              hint="A partir de esta cantidad acumulada del pedido"
              tooltip="A partir de cuantas piezas ACUMULADAS en un mismo pedido se usa el markup de mayoreo en vez del de menudeo para calcular el precio sugerido."
            >
              <NumberInput id="wholesaleThresholdQty" min={1} step={1} unit="pz" required value={form.wholesaleThresholdQty ?? null} onChange={setNumber('wholesaleThresholdQty')} />
            </Field>
            <Field
              label="Piso de margen para overrides (%)"
              htmlFor="minMarginPct"
              tooltip="Margen minimo que se exige cuando se fija un precio manual (distinto al sugerido) en el editor de producto. Si el precio capturado deja un margen menor a este porcentaje, el sistema lo rechaza y avisa cual es el precio mas bajo que si cumple."
            >
              <NumberInput id="minMarginPct" step={0.1} min={0} max={100} unit="%" required value={form.minMarginPct !== undefined ? Number(form.minMarginPct) : null} onChange={setDecimal('minMarginPct')} />
            </Field>
            <Field
              label="Multiplo de redondeo ($)"
              htmlFor="roundingMultiple"
              hint="El precio sugerido siempre redondea hacia arriba"
              tooltip="El precio sugerido siempre se redondea hacia arriba a este multiplo. Por ejemplo, con $1 un precio de $47.30 sube a $48; con $5, sube a $50."
            >
              <NumberInput id="roundingMultiple" step={0.01} min={0} unit="$" unitPosition="prefix" required value={form.roundingMultiple !== undefined ? Number(form.roundingMultiple) : null} onChange={setDecimal('roundingMultiple')} />
            </Field>
          </Card>
        </TabsContent>

        <TabsContent value="textos">
          <Card className="flex flex-col gap-4 p-4">
            <Field label="Terminos de la cotizacion" htmlFor="quotationTerms">
              <Textarea id="quotationTerms" rows={4} value={form.quotationTerms ?? ''} onChange={(e) => set('quotationTerms', e.target.value)} />
            </Field>
            <Field label="Politica de pedidos" htmlFor="orderPolicyText">
              <Textarea id="orderPolicyText" rows={3} value={form.orderPolicyText ?? ''} onChange={(e) => set('orderPolicyText', e.target.value)} />
            </Field>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
}
