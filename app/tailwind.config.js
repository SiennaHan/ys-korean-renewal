// tailwind.config.js

module.exports = {
  // ... 기타 설정
  theme: {
    extend: {
      fontFamily: {
        // 'sans'를 재정의하여 프로젝트 전체에 기본 적용
        sans: ["Pretendard", "sans-serif"],
      },
      // 3D 효과를 위한 transform 속성 추가
      'perspective-1000': {
        perspective: '1000px',
      },
      'transform-style-3d': {
        'transform-style': 'preserve-3d',
      },
      'backface-hidden': {
        'backface-visibility': 'hidden',
      },
      keyframes: {
        // 이 예시에서는 직접 유틸리티 클래스로 처리하므로 필요하지 않을 수 있지만,
        // 보다 복잡한 애니메이션을 위해 사용될 수 있습니다.
      },
    },
  },
  // ... 기타 설정
  plugins: [
    // 플러그인 목록에 사용자 정의 유틸리티를 직접 추가하는 방법 (선택 사항)
    function ({ addUtilities }) {
      const newUtilities = {
        '.perspective-1000': {
          perspective: '1000px',
        },
        '.transform-style-3d': {
          'transform-style': 'preserve-3d',
        },
        '.backface-hidden': {
          'backface-visibility': 'hidden',
        },
        '.rotate-y-0': {
          transform: 'rotateY(0deg)',
        },
        '.rotate-y-180': {
          transform: 'rotateY(180deg)',
        },
      };
      addUtilities(newUtilities, ['responsive', 'hover']);
    },
    require('@tailwindcss/forms'),
  ],
};