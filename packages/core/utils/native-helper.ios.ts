import { Trace } from '../trace';

declare let UIImagePickerControllerSourceType: any;

const radToDeg = Math.PI / 180;

function isOrientationLandscape(orientation: number) {
	return orientation === UIDeviceOrientation.LandscapeLeft /* 3 */ || orientation === UIDeviceOrientation.LandscapeRight /* 4 */;
}

function openFileAtRootModule(filePath: string): boolean {
	try {
		const appPath = iOSNativeHelper.getCurrentAppPath();
		const path = iOSNativeHelper.isRealDevice() ? filePath.replace('~', appPath) : filePath;

		const controller = UIDocumentInteractionController.interactionControllerWithURL(NSURL.fileURLWithPath(path));
		controller.delegate = iOSNativeHelper.createUIDocumentInteractionControllerDelegate();

		return controller.presentPreviewAnimated(true);
	} catch (e) {
		Trace.write('Error in openFile', Trace.categories.Error, Trace.messageType.error);
	}

	return false;
}

export namespace iOSNativeHelper {
	// TODO: remove for NativeScript 7.0
	export function getter<T>(_this: any, property: T | { (): T }): T {
		console.log('utils.ios.getter() is deprecated; use the respective native property instead');
		if (typeof property === 'function') {
			return (<{ (): T }>property).call(_this);
		} else {
			return <T>property;
		}
	}

	export namespace collections {
		export function jsArrayToNSArray(str: string[]): NSArray<any> {
			return NSArray.arrayWithArray(<any>str);
		}

		export function nsArrayToJSArray(a: NSArray<any>): Array<Object> {
			const arr = [];
			if (a !== undefined) {
				const count = a.count;
				for (let i = 0; i < count; i++) {
					arr.push(a.objectAtIndex(i));
				}
			}

			return arr;
		}
	}

	export function isLandscape(): boolean {
		console.log('utils.ios.isLandscape() is deprecated; use application.orientation instead');

		const deviceOrientation = UIDevice.currentDevice.orientation;
		const statusBarOrientation = UIApplication.sharedApplication.statusBarOrientation;

		const isDeviceOrientationLandscape = isOrientationLandscape(deviceOrientation);
		const isStatusBarOrientationLandscape = isOrientationLandscape(statusBarOrientation);

		return isDeviceOrientationLandscape || isStatusBarOrientationLandscape;
	}

	export const MajorVersion = NSString.stringWithString(UIDevice.currentDevice.systemVersion).intValue;

	export function openFile(filePath: string): boolean {
		console.log('utils.ios.openFile() is deprecated; use utils.openFile() instead');

		return openFileAtRootModule(filePath);
	}

	export function getCurrentAppPath(): string {
		const currentDir = __dirname;
		const tnsModulesIndex = currentDir.indexOf('/tns_modules');

		// Module not hosted in ~/tns_modules when bundled. Use current dir.
		let appPath = currentDir;
		if (tnsModulesIndex !== -1) {
			// Strip part after tns_modules to obtain app root
			appPath = currentDir.substring(0, tnsModulesIndex);
		}

		return appPath;
	}

	export function joinPaths(...paths: string[]): string {
		if (!paths || paths.length === 0) {
			return '';
		}

		return NSString.stringWithString(NSString.pathWithComponents(<any>paths)).stringByStandardizingPath;
	}

	export function getVisibleViewController(rootViewController: UIViewController): UIViewController {
		let viewController = rootViewController;

		while (viewController && viewController.presentedViewController) {
			viewController = viewController.presentedViewController;
		}
		return viewController;
	}

	export function applyRotateTransform(transform: CATransform3D, x: number, y: number, z: number): CATransform3D {
		if (x) {
			transform = CATransform3DRotate(transform, x * radToDeg, 1, 0, 0);
		}

		if (y) {
			transform = CATransform3DRotate(transform, y * radToDeg, 0, 1, 0);
		}

		if (z) {
			transform = CATransform3DRotate(transform, z * radToDeg, 0, 0, 1);
		}

		return transform;
	}

	export function getShadowLayer(nativeView: UIView, name?: string): CALayer {
		let layer: CALayer;
		name = name || 'ns-shadow-layer';
		if (nativeView) {
			if (nativeView.layer) {
				if (nativeView.layer.name === name) {
					console.log('- found shadow layer - reusing.');
					return nativeView.layer;
				} else {
					if (nativeView.layer.sublayers && nativeView.layer.sublayers.count) {
						console.log('nativeView.layer.sublayers.count:', nativeView.layer.sublayers.count);
						for (let i = 0; i < nativeView.layer.sublayers.count; i++) {
							console.log(`layer ${i}:`, nativeView.layer.sublayers.objectAtIndex(i));
							console.log(`layer ${i} name:`, nativeView.layer.sublayers.objectAtIndex(i).name);
							if (nativeView.layer.sublayers.objectAtIndex(i).name === name) {
								return nativeView.layer.sublayers.objectAtIndex(i);
							}
						}
						if (nativeView instanceof UITextView) {
							layer = nativeView.layer.sublayers.objectAtIndex(1);
						} else {
							layer = nativeView.layer.sublayers.objectAtIndex(nativeView.layer.sublayers.count - 1);
						}
					} else {
						layer = nativeView.layer;
					}
				}
			} else {
				// could this occur?
				console.log('no layer!');
			}
		}
		console.log('layer.name:', layer.name);
		if (!layer.name) {
			// only explicitly name if the developer had not named it themselves and/or some other integration
			layer.name = name;
		}
		return layer;
	}

	export function createUIDocumentInteractionControllerDelegate(): NSObject {
		@NativeClass
		class UIDocumentInteractionControllerDelegateImpl extends NSObject implements UIDocumentInteractionControllerDelegate {
			public static ObjCProtocols = [UIDocumentInteractionControllerDelegate];

			public getViewController(): UIViewController {
				const app = UIApplication.sharedApplication;

				return app.keyWindow.rootViewController;
			}

			public documentInteractionControllerViewControllerForPreview(controller: UIDocumentInteractionController) {
				return this.getViewController();
			}

			public documentInteractionControllerViewForPreview(controller: UIDocumentInteractionController) {
				return this.getViewController().view;
			}

			public documentInteractionControllerRectForPreview(controller: UIDocumentInteractionController): CGRect {
				return this.getViewController().view.frame;
			}
		}
		return new UIDocumentInteractionControllerDelegateImpl();
	}

	export function isRealDevice() {
		try {
			// https://stackoverflow.com/a/5093092/4936697
			const sourceType = UIImagePickerControllerSourceType.UIImagePickerControllerSourceTypeCamera;
			const mediaTypes = UIImagePickerController.availableMediaTypesForSourceType(sourceType);

			return mediaTypes;
		} catch (e) {
			return true;
		}
	}
}
