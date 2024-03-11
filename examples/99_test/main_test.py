import sys
import pathlib
import time

sys.path.append(str(pathlib.Path().resolve()))

import lightweight_pycharts as lwc


def main():
    lwc.window(title="This is only a Test", debug=True)

    # Sleep to halt main process since window process is Daemon
    time.sleep(20)


if __name__ == "__main__":
    main()
