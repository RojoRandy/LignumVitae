import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage, httpDelete, uploadProductImage } from '@/lib/http';
import { staticUrl } from '@/lib/api';
import type { ProductDto } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const ProductImagesCard = ({ product }: { product: ProductDto }) => {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const images = product.images ?? [];
  const atLimit = images.length >= 10;

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      let uploaded = 0;
      const errors: string[] = [];
      for (const file of files) {
        try {
          await uploadProductImage(product.id, file);
          uploaded += 1;
        } catch (error) {
          errors.push(`${file.name}: ${errorMessage(error)}`);
        }
      }
      return { uploaded, errors };
    },
    onSuccess: ({ uploaded, errors }) => {
      if (uploaded > 0) toast.success(`${uploaded} imagen(es) subida(s)`);
      if (errors.length > 0) toast.error(errors.join('\n'));
    },
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['products', String(product.id)] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: number) => httpDelete(`/products/images/${imageId}`),
    onSuccess: () => {
      toast.success('Imagen eliminada');
      return queryClient.invalidateQueries({ queryKey: ['products', String(product.id)] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const isPending = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div>
        <h3 className="text-body font-semibold text-text">Imágenes</h3>
        <p className="text-caption text-text-muted">Agrega fotos del producto en formato JPEG, PNG o WebP, de hasta 5 MB cada una.</p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((image) => (
          <div key={image.id} className="relative">
            <img src={staticUrl(image.url)} alt={image.alt ?? product.name} className="aspect-square w-full rounded-input object-cover" />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Eliminar imagen"
              className="absolute right-1 top-1 bg-surface-raised/90 text-danger-fg"
              disabled={isPending}
              onClick={() => deleteMutation.mutate(image.id)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
            {image.isPrimary && <Badge variant="accent" className="absolute bottom-1 left-1">Principal</Badge>}
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        disabled={atLimit || isPending}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          if (files.length > 0) uploadMutation.mutate(files);
        }}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        disabled={atLimit || isPending}
        loading={uploadMutation.isPending}
        onClick={() => inputRef.current?.click()}
      >
        Subir imágenes
      </Button>
      {atLimit && <p className="text-caption text-text-faint">Máximo 10 imágenes por producto</p>}
    </Card>
  );
};
