// Ramifica el error de un submit sobre error.code (nunca sobre el texto),
// para poder mostrarlo junto al campo correcto cuando la API lo permite.
import { useState } from 'react';
import { errorCode, errorMessage } from '@/lib/http';

export type FieldErrorMap = Record<string, string>;

const CODE_TO_FIELD: Record<string, string> = {
  USERNAME_TAKEN: 'username',
  DUPLICATE_PRODUCT_COMBINATION: 'candleId',
};

export const useFieldErrors = () => {
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleError = (error: unknown) => {
    const code = errorCode(error);
    const field = code ? CODE_TO_FIELD[code] : undefined;
    if (field) {
      setFieldErrors({ [field]: errorMessage(error) });
      setFormError(null);
    } else {
      setFieldErrors({});
      setFormError(errorMessage(error));
    }
  };

  const clear = () => {
    setFieldErrors({});
    setFormError(null);
  };

  return { fieldErrors, formError, handleError, clear };
};
