import { useParams } from 'react-router';
import { OrderDetail } from './components/order-detail';

export default function OrderDetailPage() {
  const { id } = useParams();
  return <OrderDetail orderId={id!} backTo="/pedidos" />;
}
