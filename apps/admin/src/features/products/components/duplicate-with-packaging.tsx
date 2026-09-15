import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

export const DuplicateWithPackaging = ({
  packagingOptions,
  onDuplicate,
  loading,
}: {
  packagingOptions: { value: string; label: string }[];
  onDuplicate: (packagingTypeId: number) => void;
  loading: boolean;
}) => {
  const [value, setValue] = useState<string | undefined>();
  return (
    <div className="flex items-center gap-2">
      <div className="w-48">
        <Select options={packagingOptions} value={value} onChange={setValue} placeholder="Otro empaque..." />
      </div>
      <Button type="button" variant="secondary" disabled={!value} loading={loading} onClick={() => value && onDuplicate(Number(value))}>
        <Copy className="size-3.5" /> Duplicar
      </Button>
    </div>
  );
};
