import styled from 'styled-components';

import { Svg } from './svg';

const ForegroundLine = styled.line`
  stroke: ${(p) => p.theme.colors.onBackground};
  stroke-width: 10px;
`;

interface BubbleProps {
  filled?: boolean;
}

const Bubble = styled.ellipse.attrs({ rx: 27, ry: 15 })<BubbleProps>`
  fill: ${(p) => (p.filled ? p.theme.colors.onBackground : 'none')};
  stroke: ${(p) => p.theme.colors.onBackground};
  stroke-linejoin: round;
  stroke-width: 5px;
`;

export function VerifyBallotImage(): JSX.Element {
  return (
    <Svg.FullScreenSvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 330">
      <g>
        <Svg.ForegroundFillPath d="M324.91 300.35H115.38C114.155 300.35 112.98 299.863 112.113 298.997C111.247 298.13 110.76 296.955 110.76 295.73V4.62C110.76 3.3947 111.247 2.21958 112.113 1.35317C112.98 0.486749 114.155 0 115.38 0L324.91 0C326.135 0 327.31 0.486749 328.177 1.35317C329.043 2.21958 329.53 3.3947 329.53 4.62V295.73C329.53 296.955 329.043 298.13 328.177 298.997C327.31 299.863 326.135 300.35 324.91 300.35ZM120 291.11H320.28V9.24H120V291.11Z" />
        <g>
          <Svg.ForegroundFillPath d="M139.85 31.48H153C154.494 31.4681 155.985 31.6326 157.44 31.97C158.73 32.2507 159.945 32.8067 161 33.6C162.006 34.389 162.794 35.4216 163.29 36.6C163.876 38.0889 164.154 39.6807 164.11 41.28C164.161 43.1916 163.65 45.0761 162.64 46.7C161.606 48.2414 160.033 49.3401 158.23 49.78V49.89C160.252 50.1008 162.109 51.0996 163.4 52.67C164.748 54.4697 165.424 56.6843 165.31 58.93C165.316 60.401 165.114 61.8655 164.71 63.28C164.339 64.6278 163.654 65.8684 162.71 66.9C161.657 67.9965 160.373 68.8438 158.95 69.38C157.112 70.0467 155.165 70.3622 153.21 70.31H139.85V31.48ZM147.69 47.48H149.92C151.592 47.6152 153.262 47.2047 154.68 46.31C155.226 45.8072 155.646 45.1833 155.906 44.4885C156.167 43.7938 156.261 43.0476 156.18 42.31C156.18 40.46 155.73 39.15 154.82 38.39C153.56 37.5268 152.042 37.1242 150.52 37.25H147.69V47.48ZM147.69 64.63H150.69C152.308 64.7095 153.908 64.2717 155.26 63.38C156.42 62.55 157 61 157 58.75C157.028 57.7957 156.872 56.845 156.54 55.95C156.27 55.2602 155.842 54.6436 155.29 54.15C154.752 53.6714 154.108 53.3285 153.41 53.15C152.624 52.9604 151.818 52.8697 151.01 52.88H147.64V64.58L147.69 64.63Z" />
          <Svg.ForegroundFillPath d="M177.69 31.48H187.38L197.67 70.35H189.5L187.7 62.18H177.36L175.56 70.4H167.4L177.69 31.48ZM178.69 55.7H186.31L182.55 38.23H182.44L178.69 55.7Z" />
          <Svg.ForegroundFillPath d="M200.39 70.35V31.48H208.23V63.92H222.11V70.34H200.39V70.35Z" />
          <Svg.ForegroundFillPath d="M225.59 70.35V31.48H233.43V63.92H247.31V70.34H225.59V70.35Z" />
          <Svg.ForegroundFillPath d="M250 50.9199C249.991 48.2012 250.128 45.484 250.41 42.7799C250.609 40.5536 251.219 38.3835 252.21 36.3799C253.109 34.6331 254.5 33.1871 256.21 32.2199C258.414 31.2408 260.798 30.7349 263.21 30.7349C265.621 30.7349 268.006 31.2408 270.21 32.2199C271.92 33.1871 273.31 34.6331 274.21 36.3799C275.201 38.3835 275.811 40.5536 276.01 42.7799C276.55 48.1932 276.55 53.6467 276.01 59.0599C275.811 61.2863 275.201 63.4564 274.21 65.4599C273.314 67.2096 271.923 68.6565 270.21 69.6199C268.006 70.5991 265.621 71.105 263.21 71.105C260.798 71.105 258.414 70.5991 256.21 69.6199C254.497 68.6565 253.105 67.2096 252.21 65.4599C251.219 63.4564 250.609 61.2863 250.41 59.0599C250.128 56.3559 249.991 53.6386 250 50.9199ZM257.84 50.9199C257.84 53.5299 257.9 55.7599 258.03 57.5899C258.102 59.1018 258.358 60.5994 258.79 62.0499C259.066 63.0298 259.635 63.902 260.42 64.5499C261.265 65.0649 262.235 65.3373 263.225 65.3373C264.214 65.3373 265.185 65.0649 266.03 64.5499C266.815 63.902 267.384 63.0298 267.66 62.0499C268.092 60.5994 268.347 59.1018 268.42 57.5899C268.55 55.7599 268.61 53.5299 268.61 50.9199C268.61 48.3099 268.55 46.0899 268.42 44.2799C268.347 42.7681 268.092 41.2705 267.66 39.8199C267.383 38.8218 266.803 37.9342 266 37.2799C265.155 36.765 264.184 36.4926 263.195 36.4926C262.205 36.4926 261.235 36.765 260.39 37.2799C259.6 37.9359 259.031 38.8192 258.76 39.8099C258.328 41.2605 258.072 42.7581 258 44.2699C257.873 46.0899 257.813 48.3066 257.82 50.9199H257.84Z" />
          <Svg.ForegroundFillPath d="M302.51 31.48V37.9H294V70.34H286.16V37.91H277.67V31.48H302.51Z" />
        </g>
        <ForegroundLine x1="220" y1="90" x2="220" y2="270" />
        <g>
          <Bubble cx="170" cy="120" filled />
          <Bubble cx="270" cy="120" />
          <Bubble cx="170" cy="175" />
          <Bubble cx="270" cy="175" filled />
          <Bubble cx="170" cy="230" />
          <Bubble cx="270" cy="230" filled />
        </g>
      </g>
      <g>
        <Svg.BackgroundFillPath d="M109.59 114.63C130.357 114.63 150.658 120.788 167.925 132.326C185.192 143.863 198.65 160.262 206.597 179.448C214.545 198.634 216.624 219.746 212.573 240.114C208.521 260.482 198.521 279.192 183.836 293.876C169.152 308.561 150.443 318.561 130.075 322.612C109.707 326.664 88.5946 324.585 69.4083 316.637C50.2221 308.69 33.8233 295.232 22.2858 277.965C10.7482 260.698 4.59009 240.397 4.59009 219.63C4.59009 191.782 15.6526 165.075 35.3439 145.384C55.0352 125.692 81.7424 114.63 109.59 114.63Z" />
        <Svg.ForegroundFillPath d="M109.59 329.18C87.9152 329.18 66.7271 322.753 48.7051 310.711C30.6831 298.669 16.6367 281.553 8.34209 261.528C0.0474834 241.503 -2.12276 219.468 2.10579 198.21C6.33434 176.952 16.7718 157.425 32.0982 142.098C47.4247 126.772 66.9517 116.334 88.2101 112.106C109.468 107.877 131.503 110.047 151.528 118.342C171.553 126.637 188.669 140.683 200.711 158.705C212.753 176.727 219.18 197.915 219.18 219.59C219.148 248.645 207.592 276.502 187.047 297.047C166.502 317.592 138.645 329.148 109.59 329.18ZM109.59 119.25C89.7447 119.25 70.345 125.135 53.8441 136.16C37.3433 147.186 24.4825 162.857 16.888 181.192C9.29348 199.526 7.30641 219.701 11.1781 239.165C15.0497 258.629 24.6062 276.508 38.639 290.541C52.6718 304.574 70.5506 314.13 90.0147 318.002C109.479 321.874 129.654 319.887 147.988 312.292C166.323 304.698 181.994 291.837 193.02 275.336C204.045 258.835 209.93 239.435 209.93 219.59C209.898 192.988 199.317 167.485 180.506 148.674C161.696 129.864 136.192 119.282 109.59 119.25Z" />
        <Svg.ForegroundFillPath d="M116 265.28C102.51 265.28 96.4099 263.43 71.8699 251.03L66.4499 248.28C65.3599 247.719 64.5373 246.748 64.1632 245.581C63.789 244.413 63.894 243.145 64.4549 242.055C65.0159 240.965 65.9868 240.142 67.1542 239.768C68.3217 239.394 69.5899 239.499 70.6799 240.06C72.4533 240.973 74.2332 241.88 76.0199 242.78C102.92 256.38 105.51 256.31 122.31 255.95C125.6 255.88 129.38 255.79 133.94 255.79C142.34 255.79 147.4 251.16 150.83 240.34C150.841 240.216 150.871 240.095 150.92 239.98L159.46 211.49C159.475 211.363 159.505 211.239 159.55 211.12C159.749 210.462 159.79 209.766 159.671 209.089C159.552 208.412 159.276 207.773 158.864 207.222C158.453 206.671 157.917 206.225 157.302 205.919C156.686 205.613 156.007 205.456 155.32 205.46H133.09C131 205.463 128.938 204.986 127.062 204.066C125.186 203.146 123.546 201.807 122.27 200.153C120.993 198.498 120.114 196.573 119.699 194.525C119.285 192.476 119.347 190.36 119.88 188.34L123.88 173.34C124.005 172.878 124.017 172.393 123.917 171.925C123.816 171.457 123.604 171.02 123.3 170.65C123.04 170.329 122.72 170.063 122.357 169.866C121.994 169.67 121.596 169.546 121.185 169.504C120.775 169.461 120.36 169.5 119.964 169.617C119.569 169.735 119.2 169.93 118.88 170.19C118.652 170.376 118.451 170.591 118.28 170.83L96.2799 204.64C95.004 206.448 93.3146 207.924 91.3526 208.947C89.3905 209.97 87.2125 210.509 84.9999 210.52H68.5199C67.8945 210.549 67.2696 210.451 66.6831 210.232C66.0967 210.012 65.5608 209.676 65.1079 209.244C64.6549 208.812 64.2944 208.292 64.0481 207.716C63.8018 207.141 63.6748 206.521 63.6748 205.895C63.6748 205.269 63.8018 204.649 64.0481 204.074C64.2944 203.498 64.6549 202.978 65.1079 202.546C65.5608 202.114 66.0967 201.778 66.6831 201.558C67.2696 201.339 67.8945 201.241 68.5199 201.27H84.9999C85.7117 201.265 86.4122 201.092 87.0446 200.765C87.677 200.438 88.2236 199.967 88.6399 199.39L110.64 165.56C111.308 164.604 112.102 163.743 113 163C115.016 161.347 117.505 160.374 120.108 160.221C122.711 160.069 125.296 160.744 127.492 162.151C129.688 163.557 131.382 165.623 132.332 168.051C133.282 170.48 133.439 173.147 132.78 175.67L128.78 190.67C128.607 191.316 128.585 191.993 128.717 192.649C128.849 193.305 129.131 193.921 129.54 194.45C129.959 194.986 130.494 195.42 131.106 195.718C131.718 196.016 132.389 196.171 133.07 196.17H155.23C157.332 196.164 159.407 196.644 161.293 197.573C163.178 198.502 164.824 199.854 166.1 201.525C167.376 203.195 168.249 205.138 168.649 207.202C169.05 209.265 168.968 211.393 168.41 213.42C168.409 213.555 168.378 213.688 168.32 213.81L159.79 242.28C159.79 242.43 159.72 242.58 159.68 242.72C155.03 257.72 146.59 265.01 133.86 265.01C129.39 265.01 125.67 265.09 122.44 265.16C120.08 265.24 117.93 265.28 116 265.28Z" />
        <Svg.ForegroundFillPath d="M68.52 265.29H59.39C58.2006 265.235 57.0782 264.723 56.256 263.862C55.4338 263.001 54.9751 261.856 54.9751 260.665C54.9751 259.474 55.4338 258.329 56.256 257.468C57.0782 256.607 58.2006 256.095 59.39 256.04H63.89V201.39H59.39C58.2006 201.335 57.0782 200.823 56.256 199.962C55.4338 199.101 54.9751 197.956 54.9751 196.765C54.9751 195.574 55.4338 194.429 56.256 193.568C57.0782 192.707 58.2006 192.195 59.39 192.14H68.52C69.1267 192.14 69.7275 192.26 70.288 192.492C70.8485 192.724 71.3578 193.064 71.7868 193.493C72.2158 193.922 72.5561 194.431 72.7883 194.992C73.0205 195.553 73.14 196.153 73.14 196.76V260.65C73.1426 261.257 73.0257 261.858 72.796 262.42C72.5662 262.981 72.2281 263.492 71.801 263.923C71.3738 264.354 70.866 264.696 70.3065 264.931C69.7469 265.165 69.1467 265.287 68.54 265.29H68.52Z" />
      </g>
    </Svg.FullScreenSvg>
  );
}