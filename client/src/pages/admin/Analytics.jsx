import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Analytics = () => {
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth()); // 0-11
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hoveredBar, setHoveredBar] = useState(null);
    const hoverTimeoutRef = useRef(null);

    const token = localStorage.getItem('adminToken');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    // Helper functions for hover management
    const handleBarEnter = (day) => {
        // Clear any pending timeout
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        setHoveredBar(day);
    };

    const handleBarLeave = () => {
        // Add a small delay before clearing hover state
        // This allows the user to move to the tooltip without it disappearing
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredBar(null);
        }, 150);
    };

    const handleTooltipEnter = () => {
        // Cancel the timeout if mouse enters tooltip
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    };

    const handleTooltipLeave = () => {
        // Clear immediately when leaving tooltip
        setHoveredBar(null);
    };

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const response = await api.get(
                    `/admin/analytics?month=${selectedMonth + 1}&year=${selectedYear}`,
                    config
                );
                setData(response.data.data);
            } catch (error) {
                toast.error('Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [selectedMonth, selectedYear]);

    const handlePreviousMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(prev => prev - 1);
        } else {
            setSelectedMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(prev => prev + 1);
        } else {
            setSelectedMonth(prev => prev + 1);
        }
    };

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
                marginBottom: 'var(--space-xl)',
                flexWrap: 'wrap',
                gap: 'var(--space-md)'
            }}>
                <div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 4 }}>Analytics</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Track your performance</p>
                </div>

                {/* Month/Year Selector */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    background: 'var(--bg-card)',
                    padding: 'var(--space-sm)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                }}>
                    <button
                        onClick={handlePreviousMonth}
                        className="btn btn-ghost btn-icon"
                        style={{ width: 36, height: 36, minHeight: 'auto' }}
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="input select"
                        style={{
                            minHeight: 'auto',
                            padding: '8px 32px 8px 12px',
                            fontSize: 'var(--font-size-sm)',
                            minWidth: 120
                        }}
                    >
                        {months.map((month, idx) => (
                            <option key={idx} value={idx}>{month}</option>
                        ))}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="input select"
                        style={{
                            minHeight: 'auto',
                            padding: '8px 32px 8px 12px',
                            fontSize: 'var(--font-size-sm)',
                            minWidth: 90
                        }}
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleNextMonth}
                        className="btn btn-ghost btn-icon"
                        style={{ width: 36, height: 36, minHeight: 'auto' }}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-xl)'
            }}>
                <div className="admin-card-stagger">
                    <SummaryCard
                        icon={<DollarSign size={24} />}
                        label="Revenue"
                        value={`₹${((summary?.totalRevenue || 0) / 100).toLocaleString()}`}
                        change={summary?.revenueChange}
                        color="var(--success)"
                    />
                </div>
                <div className="admin-card-stagger">
                    <SummaryCard
                        icon={<ShoppingBag size={24} />}
                        label="Orders"
                        value={summary?.totalOrders || 0}
                        change={summary?.ordersChange}
                        color="var(--primary-500)"
                    />
                </div>
                <div className="admin-card-stagger">
                    <SummaryCard
                        icon={<BarChart3 size={24} />}
                        label="Avg Order Value"
                        value={`₹${((summary?.avgOrderValue || 0) / 100).toFixed(0)}`}
                        color="var(--secondary-500)"
                    />
                </div>
            </div>

            {/* Enhanced Chart */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-lg)',
                marginBottom: 'var(--space-xl)',
                border: '1px solid var(--border-subtle)'
            }} className="admin-card-stagger">
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--space-lg)'
                }}>
                    <h2 style={{ fontSize: 'var(--font-size-lg)' }}>
                        Daily Revenue - {months[selectedMonth]} {selectedYear}
                    </h2>
                    {hoveredBar && (
                        <div
                            className="chart-tooltip"
                            onMouseEnter={handleTooltipEnter}
                            onMouseLeave={handleTooltipLeave}
                            style={{
                                background: 'var(--bg-elevated)',
                                padding: 'var(--space-sm) var(--space-md)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-light)',
                                fontSize: 'var(--font-size-sm)',
                                pointerEvents: 'auto'
                            }}
                        >
                            <strong>{hoveredBar.date}</strong><br />
                            Revenue: ₹{(hoveredBar.revenue / 100).toFixed(0)}<br />
                            Orders: {hoveredBar.orders}
                        </div>
                    )}
                </div>

                {chartData && chartData.length > 0 ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '2px',
                        height: 240,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        padding: 'var(--space-sm) 0'
                    }}>
                        {chartData.map((day, idx) => {
                            const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);
                            const height = (day.revenue / maxRevenue) * 200;
                            const isHovered = hoveredBar?.date === day.date;

                            return (
                                <div
                                    key={idx}
                                    style={{
                                        flex: '1 1 0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 'var(--space-xs)',
                                        minWidth: chartData.length > 20 ? 20 : 30,
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={() => handleBarEnter(day)}
                                    onMouseLeave={handleBarLeave}
                                >
                                    <div
                                        className="chart-bar"
                                        style={{
                                            width: '100%',
                                            height: Math.max(height, day.revenue > 0 ? 8 : 2),
                                            background: day.revenue > 0
                                                ? isHovered
                                                    ? 'linear-gradient(to top, var(--primary-500), var(--primary-300))'
                                                    : 'linear-gradient(to top, var(--primary-600), var(--primary-400))'
                                                : 'var(--border-subtle)',
                                            borderRadius: 'var(--radius-sm)',
                                            transition: 'all 0.2s ease',
                                            opacity: isHovered ? 1 : 0.85,
                                            boxShadow: isHovered && day.revenue > 0 ? '0 4px 12px rgba(255, 107, 53, 0.4)' : 'none'
                                        }}
                                        title={`${day.date}: ₹${(day.revenue / 100).toFixed(0)} - ${day.orders} orders`}
                                    />
                                    {chartData.length <= 31 && idx % Math.ceil(chartData.length / 15) === 0 && (
                                        <span style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--text-muted)',
                                            whiteSpace: 'nowrap',
                                            transform: 'rotate(-45deg)',
                                            transformOrigin: 'top left'
                                        }}>
                                            {new Date(day.date).getDate()}
                                        </span>
                                    )}
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
            }} className="admin-card-stagger">
                <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-lg)' }}>
                    Top Selling Items
                </h2>

                {topItems && topItems.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {topItems.map((item, idx) => (
                            <div
                                key={idx}
                                className="hover-lift"
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
    <div className="hover-lift" style={{
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
