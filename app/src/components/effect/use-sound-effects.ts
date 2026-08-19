import useSound from 'use-sound';
import { useConfetti } from './confetti-provider';
import { useLottieEffect } from './lottie-effect-provider';


export interface AppSounds {
  unlock: () => void;
  playClick: () => void;
  playCorrect: () => void;
  playCorrectWithConfetti: () => void;
  playIncorrect: () => void;
  playPop: () => void;
  playMissionChecked: () => void;
}

export const useSoundEffects = (): AppSounds => {

  const lottieEffect = useLottieEffect()
  const confetti = useConfetti()

  const [playUnlock] = useSound("/sounds/click.mp3", { volume: 0.1 });
  const [click] = useSound("/sounds/click.mp3", { volume: 0.7 });
  const [correct] = useSound("/sounds/correct.mp3", { volume: 0.8 });
  const [incorrect] = useSound("/sounds/incorrect.mp3", { volume: 0.9 });
  const [pop] = useSound("/sounds/pop.mp3", { volume: 1 });
  const [missionChecked] = useSound("/sounds/mission-checked.mp3", { volume: 0.8 });

  const unlock = () => {
    playUnlock();
  }

  const playClick = () => {
    click();
  }

  const playCorrect = () => {
    lottieEffect.playCelebration();
    // confetti.fireBigBang();
    correct();
  }

  const playCorrectWithConfetti = () => {
    confetti.firePop();
    correct();
  }

  const playMissionChecked = () => {
    missionChecked();
  }

  const playIncorrect = () => {
    incorrect();
  }

  const playPop = () => {
    pop();
  }

  return {
    unlock,
    playClick,
    playCorrect,
    playCorrectWithConfetti,
    playIncorrect,
    playPop,
    playMissionChecked
  };
};
