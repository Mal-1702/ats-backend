import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import GradientBlinds from '../components/GradientBlinds';
import './WelcomeScreen.css';

const WelcomeScreen = () => {
  const navigate = useNavigate();
  const screenRef = useRef(null);
  const contentRef = useRef(null);
  const cubesWrapperRef = useRef(null);

  const handleProceed = () => {
    const tl = gsap.timeline({
      onComplete: () => {
        navigate('/login');
      }
    });

    // Cinematic zoom-in effect
    tl.to(contentRef.current, {
      scale: 3,
      opacity: 0,
      duration: 1,
      ease: 'power3.in',
      force3D: true
    }, 0);

    tl.to(cubesWrapperRef.current, {
      scale: 2,
      opacity: 0,
      duration: 1.2,
      ease: 'power2.in',
      force3D: true
    }, 0.1);

    tl.to(screenRef.current, {
      backgroundColor: '#000',
      duration: 1.5
    }, 0);
  };

  return (
    <div ref={screenRef} className="welcome-screen">
      <div ref={cubesWrapperRef} className="welcome-cubes-wrapper">
        <GradientBlinds 
          gradientColors={['#1e40af', '#7e22ce']}
          angle={45}
          noise={0.1}
          blindCount={24}
          spotlightRadius={0.7}
        />
      </div>

      <div ref={contentRef} className="welcome-content-overlay">
        <div className="welcome-text-container">
          <h1 className="welcome-title-heavy">WELCOME TO</h1>
          <h2 className="welcome-title-brand">ATS PRO</h2>
        </div>
        
        <button className="proceed-button-pill" onClick={handleProceed}>
          <span className="proceed-text">Get Started</span>
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
