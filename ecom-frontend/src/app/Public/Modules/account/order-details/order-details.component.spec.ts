import { ActivatedRoute } from '@angular/router';
import { OrderDetailsComponent } from './order-details.component';

describe('OrderDetailsComponent rules', () => {
  let component: OrderDetailsComponent;
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

  beforeEach(() => {
    // These rules don't touch the API, so the services can be stand-ins
    const route = { snapshot: { paramMap: new Map() } } as unknown as ActivatedRoute;
    component = new OrderDetailsComponent(route, {} as any, {} as any);
  });

  const order = (overrides: any) => ({ _id: 'o1', orderDate: daysAgo(10), products: [{ size: 'M' }], ...overrides });

  it('only allows cancelling before shipping', () => {
    component.order = order({ status: 'Pending' }) as any;
    expect(component.canCancel).toBeTrue();
    component.order = order({ status: 'Shipped' }) as any;
    expect(component.canCancel).toBeFalse();
  });

  it('allows returns for 7 days after delivery', () => {
    component.order = order({ status: 'Delivered', deliveredAt: daysAgo(3) }) as any;
    expect(component.canReturn).toBeTrue();
    component.order = order({ status: 'Delivered', deliveredAt: daysAgo(8) }) as any;
    expect(component.canReturn).toBeFalse();
  });

  it('requires a different size for exchanges', () => {
    component.order = order({ status: 'Delivered' }) as any;
    component.returnType = 'Exchange';
    component.returnReason = 'Too small';
    component.exchangeSize = 'M';
    expect(component.canSubmitReturn).toBeFalse();
    component.exchangeSize = 'L';
    expect(component.canSubmitReturn).toBeTrue();
  });

  it('builds the tracking timeline from the status history', () => {
    component.order = order({
      status: 'Shipped',
      statusHistory: [
        { status: 'Pending', at: daysAgo(2) },
        { status: 'Shipped', at: daysAgo(1) },
      ],
    }) as any;
    const steps = component.timeline;
    expect(steps.map((s) => s.label)).toEqual(['Ordered', 'Shipped', 'Delivered']);
    expect(steps.map((s) => s.done)).toEqual([true, true, false]);
    expect(steps.find((s) => s.current)?.label).toBe('Shipped');
  });

  it('shows cancelled orders as a short timeline', () => {
    component.order = order({ status: 'Cancelled', statusHistory: [{ status: 'Pending', at: daysAgo(2) }, { status: 'Cancelled', at: daysAgo(1) }] }) as any;
    expect(component.timeline.map((s) => s.label)).toEqual(['Ordered', 'Cancelled']);
  });
});
