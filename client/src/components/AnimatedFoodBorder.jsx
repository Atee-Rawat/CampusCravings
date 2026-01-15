import { useState, useEffect } from 'react';
import './AnimatedFoodBorder.css';

// Food emoji sets that rotate
const foodSets = [
    ['🍕', '🍔', '🍟', '🌮', '🌯', '🥪', '🍿', '🧇'],
    ['🍜', '🍝', '🍛', '🍲', '🥘', '🍱', '🥡', '🍚'],
    ['🍰', '🧁', '🍩', '🍪', '🎂', '🍫', '🍬', '🍭'],
    ['☕', '🧋', '🥤', '🍵', '🧃', '🥛', '🍺', '🍹'],
    ['🥗', '🥙', '🌽', '🥕', '🍅', '🥑', '🥒', '🥬'],
];

const AnimatedFoodBorder = ({ children, className = '' }) => {
    const [currentSetIndex, setCurrentSetIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Change food set every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentSetIndex((prev) => (prev + 1) % foodSets.length);
                setIsTransitioning(false);
            }, 300); // Fade out duration
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const currentFoods = foodSets[currentSetIndex];

    return (
        <div className={`animated-food-border ${className}`}>
            {/* Rotating food items */}
            <div className={`food-orbit ${isTransitioning ? 'fading' : ''}`}>
                {currentFoods.map((food, index) => (
                    <span
                        key={`${currentSetIndex}-${index}`}
                        className="food-item"
                        style={{
                            '--index': index,
                            '--total': currentFoods.length,
                        }}
                    >
                        {food}
                    </span>
                ))}
            </div>

            {/* Content */}
            <div className="food-border-content">
                {children}
            </div>
        </div>
    );
};

export default AnimatedFoodBorder;
