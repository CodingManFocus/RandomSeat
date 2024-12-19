// Snowfall.js
import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const snowflakes = keyframes`
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(100vh);
  }
`;

const Snowflake = styled.div`
  position: fixed;
  top: -10px;
  left: ${(props) => props.left}%;
  font-size: ${(props) => props.size}px;
  opacity: ${(props) => props.opacity};
  animation: ${snowflakes} ${(props) => props.duration}s linear infinite;
  pointer-events: none;
`;

const Snowfall = () => {
  useEffect(() => {
    const body = document.body;
    body.style.overflowX = 'hidden'; 
  }, []);

  const snowflakesCount = 20;
  const snowflakesArray = [];

  for (let i = 0; i < snowflakesCount; i++) {
    const size = Math.random() * 10 + 5;
    const opacity = Math.random() * 0.5 + 0.3;
    const duration = Math.random() * 5 + 5;
    const left = Math.random() * 100;

    snowflakesArray.push(
      <Snowflake
        key={i}
        size={size}
        opacity={opacity}
        duration={duration}
        left={left}
      >
        ❄️
      </Snowflake>
    );
  }

  return <>{snowflakesArray}</>;
};

export default Snowfall;
