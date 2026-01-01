import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, User, Clock } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const Layout = () => {
    const { pathname } = useLocation();
    const { itemCount } = useCart();

    // Hide bottom nav on certain pages
    const hideNav = pathname.includes('/checkout') || pathname.includes('/order/');

    return (
        <div className="app-layout">
            <main className="main-content">
                <Outlet />
            </main>

            {!hideNav && (
                <nav className="bottom-nav">
                    <NavLink
                        to="/"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        end
                    >
                        <Home size={24} />
                        <span>Home</span>
                    </NavLink>

                    <NavLink
                        to="/orders"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Clock size={24} />
                        <span>Orders</span>
                    </NavLink>

                    <NavLink
                        to="/cart"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        style={{ position: 'relative' }}
                    >
                        <ShoppingBag size={24} />
                        <span>Cart</span>
                        {itemCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: 0,
                                right: '50%',
                                transform: 'translateX(12px)',
                                background: 'var(--primary-500)',
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: 700,
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {itemCount > 9 ? '9+' : itemCount}
                            </span>
                        )}
                    </NavLink>

                    <NavLink
                        to="/profile"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <User size={24} />
                        <span>Profile</span>
                    </NavLink>
                </nav>
            )}
        </div>
    );
};

export default Layout;
