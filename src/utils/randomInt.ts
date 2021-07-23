/**
 * @param min The minimum value
 * @param max The maximum value
 * @returns A random number (inclusive) between min and max
 */
export default function getRandomInt (min: number, max: number): number {
	return Math.floor((Math.random() * (max - min + 1)) + min)
}
