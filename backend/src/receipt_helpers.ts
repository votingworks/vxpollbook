import styled from 'styled-components';

export const StyledReceipt = styled.div``;

export function capitalizeFirstLetters(str: string): string {
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
