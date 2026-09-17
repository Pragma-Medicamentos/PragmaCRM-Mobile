import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors } from '@/constants/theme';

const DURATION = 600;

/**
 * Puente entre el splash nativo y la primera pantalla. Reproduce la misma
 * capsula sobre el mismo fondo que declara expo-splash-screen en app.json, de
 * modo que al ocultarse el nativo no hay salto visible; a partir de ahi se
 * desvanece. Si los dos dejaran de coincidir, el corte se notaria como un
 * parpadeo al arrancar.
 */
export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  const image = <Image style={styles.image} source={require('@/assets/images/brand-capsule.png')} />;

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}>
      {image}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  // La capsula mide 450x890, asi que el alto se deriva del ancho que declara
  // app.json para el splash nativo y las dos imagenes quedan del mismo tamano.
  image: {
    width: 90,
    height: 178,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
