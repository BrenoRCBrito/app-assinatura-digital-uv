import type { ViewStyle } from 'react-native';

import { FIXED_COLORS, type Theme } from '../../theme';

function guide(theme: Theme): ViewStyle {
  return {
    position: 'absolute',
    width: theme.size.cameraGuide,
    height: theme.size.cameraGuide,
    borderColor: theme.textPrimary,
  };
}

export const documentCameraPresets = {
  default: (theme: Theme) => ({
    camera: {
      flex: 1,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: theme.size.cameraBar,
      paddingHorizontal: theme.inset.cameraBarX,
    },
    hint: {
      flexShrink: 1,
      paddingVertical: theme.inset.hintY,
      paddingHorizontal: theme.inset.hintX,
      borderRadius: theme.radius.hint,
      backgroundColor: FIXED_COLORS.cameraHint,
    },
    topBarBalance: {
      width: theme.size.touchTarget,
    },
    viewfinder: {
      flex: 1,
      overflow: 'hidden',
    },
    frame: {
      position: 'absolute',
      top: theme.inset.cameraFrameY,
      right: theme.inset.cameraX,
      bottom: theme.inset.cameraFrameY,
      left: theme.inset.cameraX,
      pointerEvents: 'none',
    },
    guideTopLeft: {
      ...guide(theme),
      top: 0,
      left: 0,
      borderTopWidth: theme.lineWidth.cameraGuide,
      borderLeftWidth: theme.lineWidth.cameraGuide,
      borderTopLeftRadius: theme.radius.cameraGuide,
    },
    guideTopRight: {
      ...guide(theme),
      top: 0,
      right: 0,
      borderTopWidth: theme.lineWidth.cameraGuide,
      borderRightWidth: theme.lineWidth.cameraGuide,
      borderTopRightRadius: theme.radius.cameraGuide,
    },
    guideBottomLeft: {
      ...guide(theme),
      bottom: 0,
      left: 0,
      borderBottomWidth: theme.lineWidth.cameraGuide,
      borderLeftWidth: theme.lineWidth.cameraGuide,
      borderBottomLeftRadius: theme.radius.cameraGuide,
    },
    guideBottomRight: {
      ...guide(theme),
      right: 0,
      bottom: 0,
      borderRightWidth: theme.lineWidth.cameraGuide,
      borderBottomWidth: theme.lineWidth.cameraGuide,
      borderBottomRightRadius: theme.radius.cameraGuide,
    },
    shutterArea: {
      alignItems: 'center',
      height: theme.size.shutterArea,
      paddingTop: theme.inset.shutterTop,
    },
    shutter: {
      alignItems: 'center',
      justifyContent: 'center',
      width: theme.size.shutter,
      height: theme.size.shutter,
      borderRadius: theme.radius.shutter,
      borderWidth: theme.lineWidth.shutterRing,
      borderColor: FIXED_COLORS.shutterRing,
    },
    shutterCore: {
      width: theme.size.shutterCore,
      height: theme.size.shutterCore,
      borderRadius: theme.radius.shutterCore,
      backgroundColor: theme.textPrimary,
    },
    shutterDisabled: {
      opacity: theme.opacity.disabled,
    },
    shutterPressed: {
      opacity: theme.opacity.pressed,
    },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;
