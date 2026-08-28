import { useEffect, useState } from "react";

export function useDebouncedValue(value, delay = 400) {
  const [ditunda, setDitunda] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDitunda(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return ditunda;
}
