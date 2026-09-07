import React, { useEffect, useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  ChefHat,
  Bike,
  PackageCheck,
  XCircle,
  Phone,
  AlertCircle,
  RefreshCw,
  Receipt,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface OrderStatusViewProps {
  orderId: string;
  onClose: () => void;
}

const STATUS_STEPS: { status: OrderStatus; label: string; icon: any }[] = [
  { status: 'Order Placed', label: 'Order Placed', icon: Clock },
  { status: 'Accepted', label: 'Order Accepted', icon: CheckCircle2 },
  { status: 'Preparing', label: 'Preparing Food', icon: ChefHat },
  { status: 'Ready', label: 'Food Ready & Packed', icon: PackageCheck },
  { status: 'Out for Delivery', label: 'Out for Delivery', icon: Bike },
  { status: 'Delivered', label: 'Delivered', icon: CheckCircle2 },
];

export const OrderStatusView: React.FC<OrderStatusViewProps> = ({ orderId, onClose }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const token = localStorage.getItem('hm_customer_token');
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch (err) {
      console.warn('Live order poll: reconnecting...');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // Live polling every 5 seconds for status updates
    const interval = setInterval(() => {
      fetchOrder();
    }, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading || !order) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div className="bg-[#0e2a1b] p-8 rounded-2xl text-center text-[#fdfbf7] border border-[#235836]">
          <RefreshCw className="w-8 h-8 text-[#dfb64c] animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Retrieving Hotel Malabar live order status...</p>
        </div>
      </div>
    );
  }

  const isRejected = order.status === 'Order Rejected';
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === order.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0e2a1b] border-2 border-[#26623c] rounded-2xl shadow-2xl text-[#fdfbf7] p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#a6bfae] hover:text-[#fdfbf7] p-1.5 rounded-full hover:bg-[#1a442b] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Order Header */}
        <div className="text-center pb-4 border-b border-[#1b432a]">
          <div className="inline-flex items-center gap-1.5 bg-[#143d26] border border-[#cba135]/50 px-3 py-1 rounded-full text-xs font-mono font-bold text-[#dfb64c] mb-2">
            <span>{order.orderNumber}</span>
          </div>
          <h2 className="font-brand text-2xl font-bold text-[#fcfaf6]">
            Hotel Malabar Order Tracking
          </h2>
          <p className="text-xs text-[#8ea896] mt-0.5">
            Placed on{' '}
            {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </p>
        </div>

        {/* Live Status Highlight */}
        <div className="my-5">
          {isRejected ? (
            <div className="p-4 bg-red-950/80 border-2 border-red-700 rounded-xl text-center text-red-200">
              <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
              <h3 className="font-bold text-base text-red-300">Order Rejected</h3>
              <p className="text-xs mt-1 text-red-200">
                The restaurant was unable to accept this order due to kitchen capacity or item availability. Please call us if you have any questions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Estimated Prep Time Banner (Requirement 11) */}
              {(order.status === 'Accepted' || order.status === 'Preparing') && (
                <div className="p-4 bg-gradient-to-r from-[#143d26] via-[#1a4e31] to-[#143d26] border-2 border-[#dfb64c] rounded-xl text-center shadow-lg animate-pulse">
                  <div className="flex items-center justify-center gap-2 text-[#dfb64c] font-bold text-sm sm:text-base">
                    <Clock className="w-5 h-5" />
                    <span>Your food will be ready in approximately {order.estimatedPrepTimeMinutes} minutes.</span>
                  </div>
                  <p className="text-[11px] text-[#c9dcce] mt-1">
                    Freshly cooked in authentic Malabar style in our kitchen.
                  </p>
                </div>
              )}

              {order.status === 'Ready' && (
                <div className="p-3 bg-emerald-950/90 border border-emerald-600 rounded-xl text-center text-emerald-200 text-xs sm:text-sm font-semibold">
                  ✓ Food is packed hot & ready. Waiting for delivery dispatch.
                </div>
              )}

              {order.status === 'Out for Delivery' && (
                <div className="p-3 bg-amber-950/90 border border-amber-500 rounded-xl text-center text-amber-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
                  <Bike className="w-5 h-5 text-amber-400 animate-bounce" />
                  <span>Out for Delivery to {order.deliveryArea}! Please keep cash ready.</span>
                </div>
              )}

              {order.status === 'Delivered' && (
                <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-xl text-center text-emerald-200 text-xs sm:text-sm font-semibold">
                  🎉 Order successfully delivered. Enjoy your Malabar feast!
                </div>
              )}

              {/* Progress Steps Visualizer */}
              <div className="py-2">
                <div className="space-y-3">
                  {STATUS_STEPS.map((step, idx) => {
                    const isCompleted = currentStepIndex >= idx;
                    const isCurrent = currentStepIndex === idx;
                    const IconComponent = step.icon;

                    return (
                      <div key={step.status} className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                            isCompleted
                              ? 'bg-[#dfb64c] border-[#dfb64c] text-[#0a1f13]'
                              : 'bg-[#102e1c] border-[#1f4e30] text-[#6d8a76]'
                          } ${isCurrent ? 'ring-2 ring-[#dfb64c] ring-offset-2 ring-offset-[#0e2a1b]' : ''}`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-xs sm:text-sm font-semibold block ${
                              isCompleted ? 'text-[#fcfaf6]' : 'text-[#6d8a76]'
                            } ${isCurrent ? 'text-[#dfb64c]' : ''}`}
                          >
                            {step.label}
                          </span>
                        </div>

                        {isCurrent && (
                          <span className="text-[10px] bg-[#1a442a] text-[#dfb64c] border border-[#2b6540] px-2 py-0.5 rounded-full font-mono">
                            Current
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order Details & Receipt Summary */}
        <div className="bg-[#091a10] border border-[#1b432a] rounded-xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1b432a]">
            <span className="font-semibold text-[#dfb64c] flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" />
              <span>Receipt Breakdown</span>
            </span>
            <span className="bg-[#123620] text-[#e0d8c7] px-2 py-0.5 rounded font-mono text-[10px]">
              Cash on Delivery
            </span>
          </div>

          <div className="space-y-1.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-[#c9dcce]">
                <span>
                  {item.quantity}x {item.itemName}
                </span>
                <span className="font-mono">₹{item.subtotal}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-[#1b432a] space-y-1">
            <div className="flex justify-between text-[#8ea896]">
              <span>Food Total:</span>
              <span className="font-mono">₹{order.foodTotal}</span>
            </div>
            <div className="flex justify-between text-[#8ea896]">
              <span>Delivery Charge ({order.deliveryDistanceKm} km):</span>
              <span className="font-mono">
                {order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#dfb64c] pt-1 border-t border-[#1b432a]">
              <span>Grand Total:</span>
              <span className="font-mono">₹{order.grandTotal}</span>
            </div>
          </div>

          {/* Delivery Location */}
          <div className="pt-2 border-t border-[#1b432a] text-[11px] text-[#9bb5a4]">
            <span className="font-semibold text-[#c9dcce] block">Delivering To:</span>
            <span>{order.deliveryAddress} ({order.deliveryArea})</span>
            {order.specialInstructions && (
              <span className="block text-[#dfb64c] mt-1 font-italic">
                Note: {order.specialInstructions}
              </span>
            )}
            {order.customerLatitude && order.customerLongitude && (
              <div className="mt-2 flex items-center justify-between bg-[#123620] px-2.5 py-1.5 rounded-lg border border-[#245937] text-[10px]">
                <span className="text-emerald-300 flex items-center gap-1 font-semibold">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>GPS Pin Attached ({order.customerLatitude.toFixed(4)}, {order.customerLongitude.toFixed(4)})</span>
                </span>
                <a
                  href={order.googleMapsUrl || `https://www.google.com/maps?q=${order.customerLatitude},${order.customerLongitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#dfb64c] hover:underline font-semibold flex items-center gap-0.5 ml-2"
                >
                  <span>Google Maps</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1b432a]">
          <a
            href="tel:9567562071"
            className="flex-1 bg-[#123620] hover:bg-[#184428] text-[#c9dcce] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#245937] transition-all cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5 text-[#dfb64c]" />
            <span>Call Restaurant</span>
          </a>

          <button
            onClick={() => fetchOrder(true)}
            disabled={refreshing}
            className="bg-[#163d25] hover:bg-[#205534] text-[#dfb64c] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#cba135]/40 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>
    </div>
  );
};
