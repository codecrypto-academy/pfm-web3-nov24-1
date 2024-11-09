import { memo } from 'react'

const BubbleBackground = memo(() => {
    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Burbujas grandes */}
            <div className="bubble bubble-lg" style={{ left: '15%', top: '20%', animationDelay: '0s' }}></div>
            <div className="bubble bubble-lg" style={{ left: '80%', top: '60%', animationDelay: '-6s' }}></div>

            {/* Burbujas medianas */}
            <div className="bubble bubble-md" style={{ left: '65%', top: '35%', animationDelay: '-3s' }}></div>
            <div className="bubble bubble-md" style={{ left: '45%', top: '45%', animationDelay: '-7s' }}></div>
            <div className="bubble bubble-md" style={{ left: '25%', top: '55%', animationDelay: '-4s' }}></div>

            {/* Burbujas pequeñas */}
            <div className="bubble bubble-sm" style={{ left: '25%', top: '75%', animationDelay: '-4s' }}></div>
            <div className="bubble bubble-sm" style={{ left: '70%', top: '85%', animationDelay: '-2s' }}></div>
            <div className="bubble bubble-sm" style={{ left: '35%', top: '25%', animationDelay: '-8s' }}></div>

            {/* Micro burbujas */}
            <div className="bubble bubble-xs" style={{ left: '20%', top: '40%', animationDelay: '-1s' }}></div>
            <div className="bubble bubble-xs" style={{ left: '55%', top: '65%', animationDelay: '-5s' }}></div>
            <div className="bubble bubble-xs" style={{ left: '85%', top: '30%', animationDelay: '-3s' }}></div>
            <div className="bubble bubble-xs" style={{ left: '40%', top: '80%', animationDelay: '-7s' }}></div>
            <div className="bubble bubble-xs" style={{ left: '75%', top: '15%', animationDelay: '-2s' }}></div>
        </div>
    )
})

BubbleBackground.displayName = 'BubbleBackground'
export default BubbleBackground
