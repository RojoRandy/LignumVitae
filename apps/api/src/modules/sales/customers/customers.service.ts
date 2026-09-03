import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomerRepository } from './customer.repository';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { SalesErrors } from '../../../common/errors/sales.errors';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, search, onlyActive = true } = query;
    const where: Prisma.CustomerWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(search
        ? { OR: [{ fullName: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.customerRepository.findMany({ where, orderBy: { fullName: 'asc' }, ...paginate(page, limit) }),
      this.customerRepository.count(where),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: number) {
    const customer = await this.customerRepository.findById(id);
    if (!customer) throw SalesErrors.Exceptions.CUSTOMER_NOT_FOUND({ id });
    return customer;
  }

  create(dto: CreateCustomerDto) {
    return this.customerRepository.create(dto);
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findById(id);
    return this.customerRepository.update(id, dto);
  }

  /** No se borra fisico: se apaga, pero solo si no tiene pedidos abiertos --
   *  dar de baja a un cliente con un pedido en produccion dejaria ese pedido
   *  huerfano de contacto. */
  async deactivate(id: number) {
    await this.findById(id);
    const activeOrders = await this.customerRepository.countActiveOrders(id);
    if (activeOrders > 0) {
      const sampleFolios = await this.customerRepository.findActiveOrderFolios(id);
      throw SalesErrors.Exceptions.CUSTOMER_HAS_ACTIVE_ORDERS({ customerId: id, activeOrders, sampleFolios });
    }
    return this.customerRepository.deactivate(id);
  }
}
