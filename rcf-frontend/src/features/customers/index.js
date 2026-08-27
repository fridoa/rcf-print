/**
 * Barrel modul customers. Feature lain (nanti orders) HANYA boleh
 * mengimpor dari file ini — bukan menembus ke ../components/...
 */
export { CustomerListPage } from "./pages/CustomerListPage";
export { CustomerTable } from "./components/CustomerTable";
export { CustomerForm } from "./components/CustomerForm";
export { customerApi } from "./api/customer.api";
export { customerSchema } from "./schemas/customer.schema";
export { useCustomers, useInfiniteCustomers, customerKeys } from "./hooks/useCustomers";
export {
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "./hooks/useCustomerMutations";
