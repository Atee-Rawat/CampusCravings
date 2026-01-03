import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, BarChart3 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Analytics = () => {
    const [period, setPeriod] = useState('week');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('adminToken');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/admin/analytics?period=${period}`, config);
                setData(response.data.data);
            } catch (error) {
                toast.error('Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [period]);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    const { summary, chartData, topItems } = data || {};

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-xl)'
            }}>
                <div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 4 }}>Analytics</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Track your performance</p>
                </div>

                {/* Period Selector */}
                <div style={{
                    display: 'flex',
                    gap: 'var(--space-sm)',
                    background: 'var(--bg-card)',
                    padding: 'var(--space-xs)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    {['week', 'month', 'year'].map(p => (
                        <button
                            key={p}
                            className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setPeriod(p)}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-xl)'
            }}>
                <SummaryCard
                    icon={<DollarSign size={24} />}
                    label="Revenue"
                    value={`₹${((summary?.totalRevenue || 0) / 100).toLocaleString()}`}
                    change={summary?.revenueChange}
                    color="var(--success)"
                />
                <SummaryCard
                    icon={<ShoppingBag size={24} />}
                    label="Orders"
                    value={summary?.totalOrders || 0}
                    change={summary?.ordersChange}
                    color="var(--primary-500)"
                />
                <SummaryCard
                    icon={<BarChart3 size={24} />}
                    label="Avg Order Value"
                    value={`₹${((summary?.avgOrderValue || 0) / 100).toFixed(0)}`}
                    color="var(--secondary-500)"
                />
            </div>

            {/* Chart */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-lg)',
                marginBottom: 'var(--space-xl)',
                border: '1px solid var(--border-subtle)'
            }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-lg)' }}>
                    Daily Revenue
                </h2>

                {chartData && chartData.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-xs)', height: 200 }}>
                        {chartData.map((day, idx) => {
                            const maxRevenue = Math.max(...chartData.map(d => d.revenue));
                            const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 180 : 0;

                            return (
                                <div
                                    key={idx}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 'var(--space-xs)'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '100%',
                                            height: Math.max(height, 4),
                                            background: 'linear-gradient(to top, var(--primary-600), var(--primary-400))',
                                            borderRadius: 'var(--radius-sm)',
                                            transition: 'height 0.3s ease'
                                        }}
                                        title={`₹${(day.revenue / 100).toFixed(0)} - ${day.orders} orders`}
                                    />
                                    <span style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--text-muted)',
                                        transform: 'rotate(-45deg)',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                        No data for this period
                    </div>
                )}
            </div>

            {/* Top Items */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-lg)',
                border: '1px solid var(--border-subtle)'
            }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-lg)' }}>
                    Top Selling Items
                </h2>

                {topItems && topItems.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {topItems.map((item, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 'var(--space-md)',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                    <span style={{
                                        width: 28,
                                        height: 28,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: idx < 3 ? 'var(--primary-500)' : 'var(--bg-card)',
                                        color: idx < 3 ? 'white' : 'var(--text-secondary)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: 600
                                    }}>
                                        {idx + 1}
                                    </span>
                                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                        {item.quantity} sold
                                    </span>
                                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                                        ₹{(item.revenue / 100).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                        No sales data for this period
                    </div>
                )}
            </div>
        </div>
    );
};

// Summary Card Component
const SummaryCard = ({ icon, label, value, change, color }) => (
    <div style={{
        padding: 'var(--space-lg)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
            <div style={{ color }}>{icon}</div>
            {change !== undefined && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    fontSize: 'var(--font-size-sm)',
                    color: change >= 0 ? 'var(--success)' : 'var(--error)'
                }}>
                    {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {Math.abs(change)}%
                </div>
            )}
        </div>
        <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 4 }}>{value}</p>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{label}</p>
    </div>
);

export default Analytics;
